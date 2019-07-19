const Database = require("sync-mysql-database").Database;
const auth = require("./database_auth.json");
const structure = require("./database_structure.json");
const user_data = require("./DynamicTables/user_data.json");

var database = new Database(auth, structure);

var users = database.getTable("users").query();
console.log(users.select("username").distinct().get());