# JSON.parse()
- JSON.parse() is a JavaScript method used to convert a JSON-formatted string into a JavaScript object.

# fs.writeFile(filePath, data, encoding, callback);
- filePath → Path to the file (e.g., "./MOCK_DATA.json").
- data → Content to write (must be a string).
- encoding → "utf8" ensures the text is properly encoded.
- callback → Function that runs after the file operation (handles errors)

``` js
 fs.writeFile("./MOCK_DATA.json", JSON.stringify(updatedUsers, null, 2), "utf8", (err) => {
    if (err) return res.status(500).json({ error: "Error writing file" });
    res.json({ message: "User deleted successfully" });
});

```

# fs.readFile(filePath, encoding, callback);
- filePath → Path to the file.
- encoding → "utf8" ensures readable text.
- callback → Function to handle data or errors.

# fs.appendFile(filePath, data, encoding, callback);

``` js
fs.unlink("./MOCK_DATA.json", (err) => {
    if (err) console.error("Error deleting file");
});
```

# JSON.stringify(updatedUsers, null, 2);
- updatedUsers → JavaScript object (array of users).
- null, 2 → Controls formatting/indentation of the output JSON.


# fs.mkdir() – Create a New Folder
``` js
fs.mkdir("myFolder", (err) => {
    if (err) console.error("Error creating folder:", err);
    else console.log("Folder created!");
});

// Use { recursive: true } to create nested directories:

fs.mkdir("parentFolder/childFolder", { recursive: true }, (err) => {
    if (err) console.error("Error creating folders:", err);
    else console.log("Nested folders created!");
});
```

# fs.readdir() – List Files in a Directory
``` js
fs.readdir(".", (err, files) => {
    if (err) console.error("Error reading directory:", err);
    else console.log("Files in directory:", files);
});
```

# fs.rmdir() – Remove an Empty Folder
``` js
fs.rmdir("myFolder", (err) => {
    if (err) console.error("Error deleting folder:", err);
    else console.log("Folder deleted!");
});

//💡 For non-empty directories, use fs.rm() instead:

fs.rm("myFolder", { recursive: true, force: true }, (err) => {
    if (err) console.error("Error removing folder:", err);
    else console.log("Folder and its contents deleted!");
});
```

# fs.existsSync() – Check if File/Folder Exists
``` js
if (fs.existsSync("example.txt")) {
    console.log("File exists!");
} else {
    console.log("File does not exist.");
}

```

``` js
array.findIndex(callback(element, index, array), thisArg);

/*
callback → A function that is executed for each element. It receives:
element → The current element being processed in the array.
index → The index of the current element.
array → The array that findIndex() was called on.
thisArg → Optional. A value to use as this inside the callback.
*/
```

``` js 
//splice() is an array method used to add, remove, or replace elements in an array at a specific position.

array.splice(start, deleteCount, item1, item2, ...);

```

```js
// slice()-> create copy of object
```