const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");


app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

app.listen(6053);

const uri = `mongodb+srv://ashoema1:terpito2024@cluster0.j2qaj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const databaseAndCollection = {db: "library", collection: "libraryUsers"};
const { MongoClient, ServerApiVersion } = require('mongodb');




app.get("/", (request, response) => {
    response.render("index");
});

app.get("/profile", (request, response) => {
    response.render("profile");
});

app.post("/profile", (request, response) =>{
    let success = false;
    let {name, user, pass, accType} = request.body;

    async function main() {
        const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });
        try {
            await client.connect();
            const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection)
            const query = {"user" : user};

            const exists = await collection.findOne(query);
            if (exists === null){
                const person = {
                    name: name,
                    user: user,
                    pass: pass, 
                    accType: accType,
                    books: [],
                    movies: [],
                }
                await collection.insertOne(person);
                success = true;
            }     
            let infostr = `Name: ${name}<br><br>Username: ${user} <br><br> Account Type: ${accType}<br><br>`;
            infostr += `To get started, visit <a href="/rent">RENT</a> or <a href="/search"> SEARCH</a> if you're unsure what you would like to rent`;

            variables = {
                header: success ? `Welcome ${name}`: "Profile Creation Unsuccessful.",
                info: success ? infostr : "<br><br>User already exists."
            }
            
            response.render("user", variables);
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main().catch(console.error);
});

app.get("/rent", (request, response) => {
    response.render("rent");
});

app.get("/rentMedia", (request, response) => {
    medType = request.query.mediaType;
    variables = {
        bOrM: medType === "Movies" ? "Movie" : "Book",
        auth_id : medType === "Movies" ? "IMDB ID" : "Author",
        Ol_year : medType === "Movies" ? "Year" : "OL"
    }
    response.render("rentItem", variables);
 });

 app.post("/rent", (request, response) => {
    let {title, Auth_ID, OL_Year, user, pass} = request.body;
    async function main() {
        const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });
        try {
            await client.connect();
            const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);
            const query = {user : user, pass: pass};

            const exists = await collection.findOne(query);
            if(exists !== null){
                if (OL_Year.length !== 4 && (exists.accType === "Books" || exists.accType === "Both")){
                    let bookArray = exists.books;
                    await bookArray.push({title: title, author: Auth_ID});

                    const updateDocument = {
                        $set: {
                           books: bookArray,
                        },
                     };
                    await collection.updateOne(query, updateDocument);
                    let sentence = await callBook(title);
                    variables = {
                        item: "Book",
                        img: `<img src="https://covers.openlibrary.org/b/olid/${OL_Year}.jpg" width="200"/>`, 
                        data: "First sentence: " + sentence, 
                        other: ""
                    }
                    response.render("rented", variables);
                } else if (exists.accType === "Movies" || exists.accType === "Both"){
                    let movieArray = exists.movies;
                    await movieArray.push({title: title, year: OL_Year});

                    const updateDocument = {
                        $set: {
                           movies: movieArray,
                        },
                     };
                    await collection.updateOne(query, updateDocument);

                    let movie = await callMovie(title, OL_Year);
                    variables = {
                        item: "Movie",
                        img: `<img src ="https://imdb.iamidiotareyoutoo.com/photo/${Auth_ID}" width="200" />`,
                        data: "Actors: " + await movie["#ACTORS"], 
                        other: `<video controls width="400"> <source src ="https://imdb.iamidiotareyoutoo.com/media/${Auth_ID}">  </video>`
                    }
                    response.render("rented", variables);
                } else {
                    variables = {
                        header : "Renting Unsuccessful",
                        info : "Your account cannot rent this type of media. Try again.",
                    }
                    response.render("user", variables);
                }
            }else {
                variables = {
                    header : "Renting Unsuccessful",
                    info : "Account does not exists, please try again.",
                }
                response.render("user", variables);
            }
            } catch (e) {
                console.error(e);
            } finally {
                await client.close();
            }
        }
        main().catch(console.error);
 });

app.get("/search", (request, response) => {
    response.render("search");
});

app.get("/searchMedia", (req, res) => {
    medType = req.query.mediaType;
    title = req.query.title;
    amt = req.query.amt;
    async function main(){
        if(medType === "Books"){
            res.render("searched", {result: await searchBook(title, amt)});
        } else {
            res.render("searched",{result:  await searchMovie(title, amt)});
        }
    }
    main().catch(console.error);
});

app.get("/manageAccount", (req, res) => {
    res.render("manageAccount");
});

app.post("/manageAccount", (req, res) => {
    let {user, pass} = req.body;
    async function main() {
        const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });
        try {
            await client.connect();
            const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection)
            const query = {"user" : user, "pass" : pass};

            const exists = await collection.findOne(query);
             
            if(exists !== null){
                let str = "";
                if(exists.accType === "Books" || exists.accType === "Both"){
                    str += "Books Rented: <br>";
                    exists.books.forEach(element => str += "Title: " + element.title + " Author: " + element.author + "<br>");
                }
                if(exists.accType === "Movies" || exists.accType === "Both"){
                    str += "Movies Rented: <br>";
                    exists.movies.forEach(element => str += "Title: " + element.title + " Release Year: " + element.year + "<br>");
                }
                res.render("acct", {result: str});
            } else {
                res.render("acct", {result: "There are no accounts associated with this information"});
            }
            
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main().catch(console.error);

});

app.get("/return", (req, res) => {
    variables = {
        header: "Return an Item", 
        info: `<form action="/return" method="post"> Title: <input type = "text" name="title" required> <br> <br>  Username: <input type="text" name="user" required> <br> <br>
        Password: <input type="password" required name="pass"> <br> <br> Media Type: <label><input type="radio" name="medType" value="Books" required>Books</label>
        <label><input type="radio" name="medType" value="Movies" required>Movies</label> <br> <br>
        <input id="button" type="submit" onclick="return window.confirm("Create this account? \nYour information cannot be changed afterwards")" value="Return Item"></form>`
    }
    res.render("return", variables);
});

app.post("/return", (request, response) => {
    let {title, user, pass, medType} = request.body;
    async function main() {
        const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });
        try {
            await client.connect();
            const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection)
            const query = {"user" : user, "pass" : pass};
        
            const exists = await collection.findOne(query);
     
            if(exists !== null){
                if (medType === "Books" && exists.books.find(element => element.title === title) !== undefined){
                    let bookArray = exists.books;
                    let array = await bookArray.filter(element => element.title !== title);
                    const updateDocument = {
                        $set: {
                           books: array,
                        },
                     };
                    await collection.updateOne(query, updateDocument);
                    variables = {
                       header: "Return Successful",
                       info: `$${title} has been returned`
                    }
                    response.render("return", variables);
                } else if (medType === "Movies" && exists.movies.find(element => element.title === title) !== undefined){
                    let movieArray = exists.movies;
                    let array = await movieArray.filter(element => element.title !== title);
                   
                    const updateDocument = {
                        $set: {
                           movies: array,
                        },
                     };

                    await collection.updateOne(query, updateDocument);
                    variables = {
                       header: "Return Successful",
                       info: `${title} has been returned`
                    }
                    response.render("return", variables);
                } else {
                    variables = {
                        header : "Returning Unsuccessful",
                        info : "You did not rent this item.",
                    }
                    response.render("return", variables);
                }
            }else {
                variables = {
                    header : "Returning Unsuccessful",
                    info : "Account does not exists, please try again.",
                }
                response.render("return", variables);
            }
            } catch (e) {
                console.error(e);
            } finally {
                await client.close();
            }
        }
        main().catch(console.error);
});

app.get("/delete", (req, res) => {
    res.render("delete");
});

app.post("/delete", (req, res) => {
    let {user, pass} = req.body;
    async function main() {
        const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });
        try {
            await client.connect();
            const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection)
            const query = {"user" : user, "pass" : pass};

            let deleted = await collection.deleteOne(query);

            if(deleted.deletedCount === 1){
                variables = {
                    header: "Account deleted", 
                    info : ""
                }
                res.render("user", variables);
            }else {
                variables = {
                    header: "Account did not exist", 
                    info : ""
                }
                res.render("user", variables);
            }
             
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main().catch(console.error);
});

async function callBook(title){
    const response = await fetch(`https://openlibrary.org/search.json?title=${title}`);
    const json = await response.json();
    let {docs} = json; 
    try {
        let str = docs[0].first_sentence;
        return str;
    }catch(e) {
        return "No First Sentence Available";
    }
    
}

async function callMovie(title, year){
    const response = await fetch(`https://imdb.iamidiotareyoutoo.com/search?q=${title}`);
    const json = await response.json();
    let {description} = json; 
    try {
        let movie = description.find(element => element["#YEAR"] == year);
        return movie;
    }catch(e) {

    }
    
}


async function searchBook(title, amt){
    const response = await fetch(`https://openlibrary.org/search.json?q=${title}`);
    const json = await response.json();
    let {numFound, docs} = json;
    let str = "";
    for(let i = 0; i < amt; i++){
        if(i < numFound){
            str += "Title: " + docs[i].title + " Author: " + docs[i].author_name + " OLID: " + (docs[i].cover_edition_key !== undefined ? docs[i].cover_edition_key : docs[i].edition_key[0]);
            str += "<br>";
            }
    }
   return str;
}

async function searchMovie(title, amt){
    const response = await fetch(`https://imdb.iamidiotareyoutoo.com/search?q=${title}`);
    const json = await response.json();
    let {description} = json;
    let str = "";
    for(let i = 0; i < amt; i++){
        if(i < description.length){
            str += "Title: " + description[i]["#TITLE"] + " Release Year: " + description[i]["#YEAR"]+ " IMDB ID: " + description[i]["#IMDB_ID"];
            str += "<br>";
            }
    }
   return str;
}