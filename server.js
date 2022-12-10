const graphQLServerLib = require('@dreamit/graphql-server');
const graphQLLib = require('graphql');

const userOne = { userId: '1', userName: 'UserOne' }
const userTwo = { userId: '2', userName: 'UserTwo' }


const userSchema = graphQLLib.buildSchema(`
    schema {
      query: Query
      mutation: Mutation
    }
    
    type Query {
      returnError: User 
      users: [User]
      user(id: String!): User
    }
    
    type Mutation {
      login(userName: String, password: String): LoginData
      logout: LogoutResult
    }
    
    type User {
      userId: String
      userName: String
    }
    
    type LoginData {
      jwt: String
    }
    
    type LogoutResult {
      result: String
    }
  `)

const userSchemaResolvers = {
    returnError() {
        throw new graphQLServerLib.GraphQLError('Something went wrong!', {})
    },
    users() {
        return [userOne, userTwo]
    },
    user(input) {
        switch (input.id) {
            case '1': {
                return userOne
            }
            case '2': {
                return userTwo
            }
            default: {
                throw new graphQLServerLib.GraphQLError(`User for userid=${input.id} was not found`, {})
            }
        }
    },
    logout() {
        return { result: 'Goodbye!' }
    }
}

const graphqlServer = new graphQLServerLib.GraphQLServer(
    {
        schema: userSchema,
        rootValue: userSchemaResolvers,
        logger: new graphQLServerLib.JsonLogger('grpc-server', 'user-service')
    }
)

const PROTO_PATH = __dirname + '/graphql.proto';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
const graphql_proto = grpc.loadPackageDefinition(packageDefinition).graphql;

/**
 * Implements the SendRequest RPC method.
 */
async function sendRequest(call, callback) {
    const query = call.request.query
    const response = await graphqlServer.executeRequest({ query: query })
    callback(null, { message: JSON.stringify(response) });
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
function main() {
    const server = new grpc.Server();
    server.addService(graphql_proto.GraphQL.service, { sendRequest: sendRequest });
    server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
        server.start();
    });
}

main();