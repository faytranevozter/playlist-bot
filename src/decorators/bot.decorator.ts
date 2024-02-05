/* eslint-disable @typescript-eslint/no-explicit-any */
import { Guard, MaybeArray } from "telegraf/typings/core/helpers/util";
import { Update } from "telegraf/typings/core/types/typegram";
import { UpdateType } from "telegraf/typings/telegram-types";
import { useBot } from "../libs/bot";

const bot = useBot();

export function Command(cmd?: string): MethodDecorator {
  return function (target, propertyKey, descriptor: PropertyDescriptor) {
    bot?.command(cmd || propertyKey.toString(), descriptor.value.bind(target));
  };
}

export function On(cmd: MaybeArray<UpdateType | Guard<Update>>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    bot?.on(cmd, descriptor.value.bind(target));
  };
}

export function Action(cmd?: string | RegExp) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    bot?.action(cmd || propertyKey, descriptor.value.bind(target));
  };
}
