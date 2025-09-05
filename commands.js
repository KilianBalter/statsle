import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

//Get Data command
const UPDATEDATA_COMMAND = {
  name: 'updatedata',
  description: 'Collects all score data',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

//Averages command
const AVERAGES_COMMAND = {
  name: 'averages',
  description: 'Calculates averages for every user',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

//Head to Head command
const HEADTOHEAD_COMMAND = {
  name: 'headtohead',
  description: 'Calculates head to head score between two users',
  type: 1,
  options: [
    {
      type: 6,
      name: 'user1',
      description: 'First user',
      required: true,
    },
    {
      type: 6,
      name: 'user2',
      description: 'Second user',
      required: true,
    }
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [UPDATEDATA_COMMAND, AVERAGES_COMMAND, HEADTOHEAD_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
