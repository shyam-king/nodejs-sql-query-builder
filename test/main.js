const Database = require("sync-mysql-database").Database;
const auth = require("./database_auth.json");
const structure = require("./database_structure.json");
const user_data = require("./DynamicTables/user_data.json");

var database = new Database(auth, structure);

database.createTable(user_data);
let users = database.getTable("users").query();
let names = users.select("username");
let ids = users.select("id");
database.updateDatabase();

let tokens = database.getTable("tokens").query();
console.log (tokens.get());

let shyam_token = tokens.where("username = 'shyam'").select("token");

console.log(shyam_token.getValue());

shyam_token.update(shyam_token.getValue() + 1);
console.log(shyam_token.getValue());