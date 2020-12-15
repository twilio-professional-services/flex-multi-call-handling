# Your custom Twilio Flex Plugin

Twilio Flex Plugins allow you to customize the appearance and behavior of [Twilio Flex](https://www.twilio.com/flex). If you want to learn more about the capabilities and how to use the API, check out our [Flex documentation](https://www.twilio.com/docs/flex).

# Configuration

## Flex Plugin

This repository is a Flex plugin with some other assets. The following describes how you setup, develop and deploy your Flex plugin.

### Requirements

This plugin uses the Twilio CLI for deployment and development.

- Install or update the Twilio CLI to the latest version
  - Instructions: https://www.twilio.com/docs/twilio-cli/quickstart#install-twilio-cli
- Install or update the Flex CLI Plugin to the latest version

  - Instructions: https://www.twilio.com/docs/flex/developer/plugins/cli/install

- Install the Twilio Serverless plugin.
  - Instructions: https://www.twilio.com/docs/twilio-cli/plugins#available-plugins

### Setup

Make sure you have [Node.js](https://nodejs.org) as well as [`npm`](https://npmjs.com) installed.

Afterwards, install the dependencies by running `npm install`:

```bash
cd

# If you use npm
npm install
```

In the `/public` directory make a copy of the `appConfig.examples.js` file and rename it to `appConfig.js`, copy the contents from `appConfig.examples.js` and paste it into `appConfig.js`.

---

### Development

In order to develop locally, you can use the Twilio CLI to run the plugin locally. Using your commandline run the following from the root dirctory of the plugin.

```bash
twilio flex:plugins:start
```

This will automatically start up the Webpack Dev Server and open the browser for you. Your app will run on `http://localhost:3000`.

When you make changes to your code, the browser window will be automatically refreshed.

---

### Deploy

#### Plugin Deployment

Once you are happy with your plugin, you have to deploy then release the plugin for it to take affecte on Twilio hosted Flex.

Run the following command to start the deployment:

```bash
twilio flex:plugins:deploy --major --changelog "Notes for this version" --description "Functionality of the plugin"
```

After your deployment runs you will receive instructions for releasing your plugin from the bash prompt. You can use this or skip this step and release your plugin from the Flex plugin dashboard here https://flex.twilio.com/admin/plugins

For more details on deploying your plugin, refer to the [deploying your plugin guide](https://www.twilio.com/docs/flex/plugins#deploying-your-plugin).

Note: Common packages like `React`, `ReactDOM`, `Redux` and `ReactRedux` are not bundled with the build because they are treated as external dependencies so the plugin will depend on Flex to provide them globally.
