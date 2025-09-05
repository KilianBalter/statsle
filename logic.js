import { DiscordRequest, readData, writeData, sleep } from './utils.js';

let scoreData = new Map();
let lastParsed = new Map();

export async function getRecaps(guild, channel) {
  let scoreAndDay = readData(channel);
  scoreData.set(channel, scoreAndDay[0]);
  lastParsed.set(channel, scoreAndDay[1]);

  let noMatches = 0;
  const limit = 5;
  let finished = false;
  let first = true;
  let before = ""
  let recaps = [];

  //Get all daily recaps
  try {
    let res = [];
    while (!finished && noMatches < limit) {
      // Get messages
      if (first) {
        res = await DiscordRequest(`channels/${channel}/messages?limit=20`, { method: 'GET' })
          .then(res => res.json());
        first = false;
      }
      else
        res = await DiscordRequest(`channels/${channel}/messages?before=${before}&limit=100`, { method: 'GET' })
          .then(res => res.json());

      before = res[res.length-1].id;

      // Filter out recaps
      res = res.filter(m => m.author.id === "1211781489931452447" && m.content.includes("Your group"));

      // Check if first or already parsed recap has been reached
      if (res.some(m => +m.content.match(/[0-9]+/)[0] <= lastParsed.get(channel) || m.content.match(/[0-9]+/)[0] === "1")) {
        finished = true;
        // Filter already parsed recaps
        if (lastParsed.get(channel) != 0)
          res = res.filter(m => +m.content.match(/[0-9]+/)[0] > lastParsed.get(channel));
      }

      console.log(`Found ${res.length} recaps.`);
      if (res.length != 0)
        console.log("Last: Day " + res[res.length-1].content.match(/[0-9]+/)[0]);
      recaps = recaps.concat(res);

      if (res.length === 0)
        noMatches++;
      else
        noMatches = 0;

      await sleep(1000);
    }
  } catch (err) {
    console.error("Error fetching recaps\n", err);
  }

  console.log(`Found ${recaps.length} new recaps in <#${channel}>`);

  if (recaps.length > 0)
    parseRecaps(guild, channel, recaps);
  return;
}

async function parseRecaps(guild, channel, recaps) {
  let j = 1;
  // Get server member nicknames
  const members = await DiscordRequest(`guilds/${guild}/members?limit=1000`, { method: "GET" }).then(res => res.json());
  const nickCache = new Map();

  if (!scoreData.has(channel))
    scoreData.set(channel, new Map());

  const channelData = scoreData.get(channel);

  for (const recap of recaps) {
    console.log("Parsing recap " + j + "...");
    j++;
    const results = recap.content.split("\n");

    // Extract day
    const day = results[0].match(/[0-9]+/)[0];

    // Remove day line and crown emoji
    results.shift();
    results[0] = results[0].slice(3);

    // Parse scores per tier
    for (const tier of results) {
      let guesses = tier[0];

      let usersString = tier.slice(5);
      let userIDs = []

      // Get user IDs
      // Properly tagged
      userIDs = userIDs.concat([...[...usersString.matchAll(/<@(.*?)>/g)].map(a => a[1])]);

      // Try to handle broken tags
      const nicknames = usersString.replace(/<@.*?>/g, "").split("@").map(a => a.trim()).filter(a => a != "");
      for (const nickname of nicknames) {
        if (nickCache.has(nickname)) {
          userIDs = userIDs.concat(nickCache.get(nickname));
          continue;
        }
        for (const member of members) {
          if (member.nick === nickname || member.user.global_name === nickname) {
            userIDs.push(member.user.id);
            nickCache.set(nickname, member.user.id);
            break;
          }
        }
      }

      for (const id of userIDs) {
        if (!channelData.has(id))
          channelData.set(id, new Map());
        channelData.get(id).set(day, guesses);
      }
    }
  }

  lastParsed.set(channel, +recaps[0].content.match(/[0-9]+/)[0]);
  writeData(channel, channelData, lastParsed.get(channel));
  return;
}

export function calculateAverages(channel) {
  const averages = [];
  let i = 0;
  let unfinished = 0;

  for (const [user, scores] of scoreData.get(channel)) {
    averages.push([user, 0, 0, 0]);
    unfinished = 0;
    for (const score of scores.values()) {
      if (score != "X")
        averages[i][1] += +score;
      else
        unfinished++;
    }
    averages[i][1] /= scores.size - unfinished;
    averages[i][2] = scores.size - unfinished;
    averages[i][3] = unfinished;
    i += 1;
  }

  averages.sort((a, b) => a[1] - b[1]);

  return averages;
}

// Positive score: User1 better, Negative: User2 better
export function calculateHeadToHead(channel, user1, user2) {
  let user1Score = 0;
  let user2Score = 0;
  let total = 0;

  const user1Scores = scoreData.get(channel).get(user1);
  const user2Scores = scoreData.get(channel).get(user2);

  for (const [day, score1] of user1Scores) {
    if (user2Scores.has(day)) {
      const score2 = user2Scores.get(day);
      if (score1 < score2)
        user1Score++;
      else if (score1 > score2)
        user2Score++;
      else {
        user1Score += 0.5;
        user2Score += 0.5;
      }
      total++;
    }
  }

  return [user1Score, user2Score, total];
}