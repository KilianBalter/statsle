import 'dotenv/config';
import fs from "fs";

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function readData(channel) {
  const path = `data/${channel}.json`;
  let data = [new Map(), 0];
  try {
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, "utf-8").trim();
      let initData = JSON.parse(content);
      const lastParsed = initData.pop();
      for (let i = 0; i < initData.length; i++) {
        initData[i][1] = new Map(initData[i][1]);
      }
      initData = new Map(initData);
      data = [initData, lastParsed];
      console.log("Score data has been read.")
    }
  } catch (err) {
    console.error("Error reading data\n", err);
    data = [new Map(), 0];
  }

  return data;
}

export function writeData(channel, data, lastParsed) {
  try {
    const serialized = [...data];
    for (let i = 0; i < serialized.length; i++) {
      serialized[i][1] = [...serialized[i][1]];
    }
    serialized.push(lastParsed);
    const serializedStr = JSON.stringify(serialized);
    fs.writeFileSync(`data/${channel}.json`, serializedStr);
    console.log("Score data has been saved.");
  } catch (err) {
    console.error("Error saving data\n", err);
  }

  return;
}
