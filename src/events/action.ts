import { Action } from "../decorators/bot.decorator";
import { Context } from "telegraf";

export class Actions {
  constructor() {}

  @Action("subscriber")
  async subscriber(ctx: Context) {
    ctx.reply("subs");
  }
}
