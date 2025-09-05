import 'dotenv/config';
import express from 'express';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { calculateAverages, calculateHeadToHead, getRecaps } from './logic.js';
import { readAllData } from './utils.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

readAllData();
/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "Get Data" command
    if (name === 'updatedata') {

      getRecaps(req.body.guild_id, req.body.channel_id);

      // Send a message into the channel where command was triggered from
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL | InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: "Done"
            }
          ]
        },
      });

      return;
    }

    // "averages" command
    if (name === 'averages') {
      let finalString = "User: Average (Completed | Failed/Unfinished)\n";
      const averages = calculateAverages(req.body.channel_id);
      for (const arr of averages) {
        finalString += `<@${arr[0]}>: ${arr[1].toFixed(2)} (${arr[2]} | ${arr[3]})\n`;
      }

      // Send a message into the channel where command was triggered from
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 1 << 12 | InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: finalString
            }
          ]
        },
      });

      return;
    }

    // "Head to Head" command
    if (name === 'headtohead') {
      const user1 = req.body.data.options[0].value;
      const user2 = req.body.data.options[1].value;

      const userScores = calculateHeadToHead(req.body.channel_id, user1, user2);
      const total = userScores[2];
      const difference = Math.abs(userScores[0] - userScores[1]);
      const winner = userScores[0] > userScores[1] ? "user1" : userScores[0] < userScores[1] ? "user2" : "tie";
      let u1Squares = Math.round((userScores[0] / total) * 10);
      let u2Squares = Math.round((userScores[1] / total) * 10);

      if (u1Squares + u2Squares > 10)
        if (u1Squares > u2Squares)
          u2Squares--;
        else
          u1Squares--;


      let u1Sign = ""
      let u1Sym = "";
      let u2Sign = "";
      let u2Sym = "";
      if (winner === "user1") {
        u1Sign = "+"
        u1Sym = "🟩";
        u2Sign = "-";
        u2Sym = "🟥";
      } else if (winner === "user2") {
        u2Sign = "+"
        u2Sym = "🟩";
        u1Sign = "-";
        u1Sym = "🟥";
      } else {
        u1Sign = "+"
        u1Sym = "🟦";
        u2Sign = "+";
        u2Sym = "🟦";
      }

      const finalString = `<@${user1}> ${u1Sign}${difference} ${u1Sym.repeat(u1Squares)}⬜${u2Sym.repeat(u2Squares)} ${u2Sign}${difference} <@${user2}>`;
      // Send a message into the channel where command was triggered from
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Suppress notifs, Components V2
          flags: 1 << 12 | 1 << 15,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: finalString
            }
          ]
        },
      });

      return;
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
