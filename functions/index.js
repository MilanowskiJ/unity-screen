const functions = require("firebase-functions");
const cheerio = require("cheerio");
const admin = require('firebase-admin');
admin.initializeApp()
const path = require('path');
const os = require('os');
const fs = require('fs');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.parseCharacterSheet = functions.storage.object().onFinalize(async (object) => {
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
      
    // Get the file name.
    const fileName = path.basename(filePath);
    
    // Download file from bucket.
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    
    await bucket.file(filePath).download({destination: tempFilePath});
    functions.logger.log('Image downloaded locally to', tempFilePath);
    
    // Parse data into firestore.
    await bucket.file(filePath).getMetadata()
        .then(metadata => {
            let $ = cheerio.load(fs.readFileSync(tempFilePath));
            let name = $("title").text().replace("- D&D Beyond","");
            let sensesNames = [];
            $(".ct-senses__callout-label").each(function(){
                let label = $(this).text();
                label = label.substring(label.indexOf("(") + 1, label.indexOf(")"));
                sensesNames.push(label);
            });
            let sensesValues = [];
            $(".ct-senses__callout-value").each(function(){
                sensesValues.push($(this).text());
            });;
            let statsNames = [];
            $(".ct-skills__col--skill").each(function(){
                statsNames.push($(this).text());
            });;
            let statsValues = [];
            $(".ct-skills__col--modifier").each(function(){
                statsValues.push($(this).text());
            });;
            let statsBase = [];
            $(".ct-skills__col--stat").each(function(){
                statsBase.push($(this).text());
            });;

            functions.logger.log(metadata[0].metadata.campaign);

            let uid = metadata[0].metadata.campaign;
            let dest = admin.firestore().collection("campaigns")
                            .doc(uid).collection("players");

            parseSheet(name, sensesNames, sensesValues, statsNames, statsValues, statsBase, dest);
        });
    
    // Once the parse is complete, delete both the local and remote file to free up storage.
    await bucket.file(filePath).delete();
    return fs.unlinkSync(tempFilePath);
});

function parseSheet(name, sensesNames, sensesValues, statsNames, statsValues, statsBase, dest){
    dest.doc(name).set({
        passivesNames: sensesNames,
        passivesValues: sensesValues,
        scoresNames: statsNames,
        scoresValues: statsValues,
        scoresStats: statsBase
    })
}
