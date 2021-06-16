const path = require('path')
const config = require('dotenv').config({ path: path.join(__dirname, 'config.env') })
const axios = require("axios")
const FormData = require('form-data');
const ProgressBar = require('progress');

const channelDict = {
	C1XXXXXXX: 'general',
	C2XXXXXXX: 'random'
}

async function deleteMessage(channelID, messageIDsToDelete) {
	console.log("Deleting messages")
	// console.log(messageIDsToDelete)
	let bar = new ProgressBar(channelDict[channelID] + ' [:bar] :current/:total :percent :elapsed', {
		complete: "#",
		incomplete: " ",
		total: messageIDsToDelete.length,
		width: 100
	})
  await messageIDsToDelete.reduce(async (p, c) => {
  	await p
		let form = new FormData()
		form.append("token", process.env.USER_TOKEN)
		form.append('channel', channelID)
		form.append('ts', c)
		let headers = form.getHeaders()
		headers["cookie"] = process.env.USER_COOKIE
	  let response = await axios.post("https://appveen.slack.com/api/chat.delete", form, {headers: headers});
  	// console.log(`Delete ${channelID} ${c} ${response.statusText}`)
  	bar.tick()
  	// return response
	return new Promise(resolve => setTimeout(resolve, 500));
  }, Promise.resolve())
}

async function getMessages(channelID, retentionDays){
	console.log(`Getting messages from ${channelDict[channelID]}(${channelID})`)
	let previousDate = new Date()
	previousDate.setDate(previousDate.getDate() - retentionDays)
	let previousDateInMillis = Math.floor(previousDate.getTime()/1000)
	// console.log(previousDateInMillis)
	const form = new FormData()
	form.append("token", process.env.USER_TOKEN)
	form.append('channel', channelID)
	const headers = form.getHeaders()
	headers["cookie"] = process.env.USER_COOKIE
  let response = await axios.post("https://appveen.slack.com/api/conversations.history", form, {headers: headers});
  let messageIDsToDelete = []
  response.data.messages.forEach(message => {
  	if(message.ts.split(".")[0] < previousDateInMillis 
  		&& (
  			message.subtype == "bot_message" ||
  			purgeableBotIDs.indexOf(message.bot_id) > -1 // xcro bit bucket
  			)
  		) {
  		// console.log(new Date(message.ts.split(".")[0] * 1000).toString())
  		messageIDsToDelete.push(message.ts)
  	}
  })
  if(messageIDsToDelete.length > 0 ) {
  	await deleteMessage(channelID, messageIDsToDelete)
  	// console.log("Waiting 10s and fetching messages")
  	// setTimeout(() => getMessages(channelID), 10000)
	getMessages(channelID, retentionDays)
  } else console.log("No more messages to clear")
}

const purgeableBotIDs = [
	"BEXXXXXXX", // myBot
]

async function init() {
  try {
  	await getMessages("C1XXXXXXX", 10)
  } catch(error){
    console.log(error)
  }
}

init()
