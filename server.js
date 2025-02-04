const graphQLServerLib = require('@dreamit/graphql-server');
const graphQLTestingLib = require('@dreamit/graphql-testing');

const graphqlServer = new graphQLServerLib.GraphQLServer(
    {
        schema: graphQLTestingLib.userSchema,
        rootValue: graphQLTestingLib.userSchemaResolvers,
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
    const response = await graphqlServer.handleRequest({ query: query })
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