/*
 * This file is part of AdBlock  <https://getadblock.com/>,
 * Copyright (C) 2013-present  Adblock, Inc.
 *
 * AdBlock is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * AdBlock is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with AdBlock.  If not, see <http://www.gnu.org/licenses/>.
 */

/* For ESLint: List any global identifiers used in this file below */
/* global browser, DOMPurify, storageSet, translate */

/* eslint-disable import/extensions */
import { getTabId, closePopup, sendMessageWithNoResponse } from './utils.js';

let template;

const openHomePage = async () => {
  sendMessageWithNoResponse({ command: 'recordGeneralMessage', msg: 'titletext_clicked' });
  const homepageURL = 'https://getadblock.com/';
  await browser.runtime.sendMessage({ command: 'openTab', urlToOpen: homepageURL });
  closePopup();
};

const openOptionsPage = async () => {
  const popupMenuDCCtaClosedKey = 'popup_menu_dc_cta_closed';
  storageSet(popupMenuDCCtaClosedKey, true);
  sendMessageWithNoResponse({ command: 'recordGeneralMessage', msg: 'options_clicked' });
  await browser.runtime.sendMessage({ command: 'openTab', urlToOpen: browser.runtime.getURL('options.html#general') });
  closePopup();
};

const openHelp = (pageInfo) => {
  sendMessageWithNoResponse({ command: 'recordGeneralMessage', msg: 'feedback_clicked' });
  if (!pageInfo.disabledSite) {
    // This navigates to the index and starts the help SPA
    window.location.assign('adblock-button-popup.html?command=showHelp');
  } else {
    sendMessageWithNoResponse({ command: 'openTab', urlToOpen: 'https://help.getadblock.com/' });
  }
};

const openPremiumTab = async () => {
  storageSet('popup_menu_dc_cta_closed', true);
  sendMessageWithNoResponse({ command: 'recordGeneralMessage', msg: 'premium_options_clicked' });
  await browser.runtime.sendMessage({ command: 'openTab', urlToOpen: browser.runtime.getURL('options.html#mab') });
  closePopup();
};

const loadTemplate = function () {
  return fetch('./button/header.html')
    .then(response => response.text())
    .then((text) => {
      template = DOMPurify.sanitize(text, { SAFE_FOR_JQUERY: true });
    });
};

const addLogoAndTheme = (info, $template) => {
  const $logo = $template.find('.header-logo');
  const popupMenuTheme = info.settings ? info.settings.color_themes.popup_menu : 'default_theme';
  $('body').attr('id', popupMenuTheme).data('theme', popupMenuTheme);
  $logo.attr('src', `icons/${popupMenuTheme}/logo.svg`);
  $logo.attr('alt', translate('adblock_logo'));
};

const checkAnddisableOnPageOptions = (info, $template) => {
  const states = ['disabledSite', 'domainPaused', 'paused', 'whitelisted'];

  if (states.some(state => info[state])) {
    $template.find('#filtering_options_wrapper').addClass('disabled');
  }
};

const checkAndShowPremium = (info, $template) => {
  if (info.activeLicense === true) {
    $template.find('#premium_status_msg').text(translate('premium'));
    $template.find('#premium_status_msg').css('display', 'inline-flex');
  }
};

const addTranslationsAndActions = (info, $template) => {
  const tabSupportText = translate('tabsupport');
  const optionsText = translate('options');
  const moreOptionsText = translate('more_options_hover');

  // Add a11y labls
  $template.find('#header-logo').attr('aria-label', translate('adblock_logo'));
  $template.find('#help_link i').attr('aria-label', tabSupportText);
  $template.find('#svg_options i').attr('aria-label', optionsText);
  $template.find('#filtering_options_wrapper i').attr('aria-label', moreOptionsText);

  // Translate hover labels
  $template.find('#help-icon-tooltip').text(tabSupportText);
  $template.find('#options-icon-tooltip').text(optionsText);
  $template.find('#more-icon-tooltip').text(moreOptionsText);

  // Add actions to buttons
  $template.find('#header-logo').on('click', openHomePage);
  $template.find('#premium_status_msg').on('click', openPremiumTab);
  $template.find('#svg_options').on('click', openOptionsPage);
  $template.find('#help_link').on('click', openHelp.bind(null, info));
};

const initialize = async function () {
  const tabId = getTabId();
  const info = await browser.runtime.sendMessage({ command: 'getCurrentTabInfo', tabId });
  const $template = $(template);

  addLogoAndTheme(info, $template);
  checkAndShowPremium(info, $template);
  addTranslationsAndActions(info, $template);
  checkAnddisableOnPageOptions(info, $template);

  // Append everything
  const $wrapper = $('#wrapper');
  $wrapper.prepend($template);
};

loadTemplate().then(async () => {
  await initialize();
});
