const { MongoClient } = require('mongodb');

async function deleteAllDocuments() {
    // MongoDB Atlas connection string
    const uri = 'mongodb+srv://gadaparaghavendra24:rKogMaTD45VyOVB2@yapsphere.fze7r.mongodb.net/?retryWrites=true&w=majority&appName=YapSphere';
    const client = new MongoClient(uri);

    try {
        await client.connect();

        // database ka name
        const database = client.db('test'); 
        // inside database collection name

        const collection = database.collection('messages'); 
        // const collection = database.collection('users'); 

        // query to delete all the collections from ATLAS
        const result = await collection.deleteMany({});

        console.log(`${result.deletedCount} documents were deleted.`);
    } catch (error) {
        console.error('Error deleting documents:', error);
    } finally {
        await client.close();
    }
}

deleteAllDocuments();