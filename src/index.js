const express = require('express')
const bodyParser = require('body-parser')
const {graphqlExpress, graphiqlExpress} = require('apollo-server-express')
const schema = require('./schema')
const {authenticate} = require('./authentication')
const formatError = require('./formatError')
const {execute, subscribe} = require('graphql')
const {createServer} = require('http')
const {SubscriptionServer} = require('subscriptions-transport-ws')

const connectMongo = require('./mongo-connector')
const buildDataloaders = require('./dataloaders')

const start = async () => {
  const mongo = await connectMongo();
  var app = express();

  const buildOptions = async (req, res) => {
    const user = await authenticate(req, mongo.Users)
    return {
      context: {
        dataloaders: buildDataloaders(mongo),
        mongo, 
        user
      },
      formatError,
      schema
    }
  }
  const PORT = 3000;
  const server = createServer(app)
  app.use('/graphql', bodyParser.json(), graphqlExpress(buildOptions));
  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    passHeader: `'Authorization': 'bearer token-test@example.email'`,
    subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`, 
  }));

  server.listen(PORT, () => {
    SubscriptionServer.create(
      {execute, subscribe, schema},
      {server, path: '/subscriptions'},
    )
    console.log(`Hackernews GraphQL server running on port ${PORT}.`)
  });
};

start();
