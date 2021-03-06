import { ApiAction } from "./app";
import Discord, { TextChannel } from "discord.js";
import * as Config from "../config";
import SkinModel from "../data/SkinModel";
import * as DiscordUtils from "../discord-bot/utils";
import UserContext from "../data/UserContext";

export default class DiscordEventHandler {
  _clientPromise: Promise<Discord.Client>;

  constructor() {
    const _client = new Discord.Client();
    this._clientPromise = _client
      .login(Config.discordToken)
      .then(() => _client);
  }

  async getClient() {
    return this._clientPromise;
  }

  async getNsfwChannel(): Promise<TextChannel> {
    const client = await this.getClient();
    const dest = client.channels.get(
      Config.NSFW_SKIN_CHANNEL_ID
    ) as TextChannel | null;
    if (dest == null) {
      throw new Error("Could not get NSFW channel");
    }
    return dest;
  }

  async handle(action: ApiAction, ctx: UserContext) {
    switch (action.type) {
      case "REVIEW_REQUESTED":
        this.requestReview(action.md5, ctx);
    }
  }

  async requestReview(md5: string, ctx: UserContext) {
    const skin = await SkinModel.fromMd5(ctx, md5);
    if (skin == null) {
      return;
    }
    const dest = await this.getNsfwChannel();
    const tweetStatus = await skin.getTweetStatus();
    if (tweetStatus === "UNREVIEWED") {
      await DiscordUtils.postSkin({
        md5,
        title: (filename) => `Review: ${filename}`,
        dest,
      });
    } else {
      await DiscordUtils.sendAlreadyReviewed({ md5, dest });
    }
  }
}
