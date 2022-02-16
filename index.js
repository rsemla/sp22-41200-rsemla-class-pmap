const {Storage} = require('@google-cloud/storage');



exports.generateThumbnails = async (file, context) => {
    const gcsFile = file;
    const storage = new Storage();
    const sourceBucket = storage.bucket(gcsFile.bucket);

    console.log(`Version: 2.01`);

    console.log(`Processing file: ${gcsFile.name}`);
    console.log(`Generation Number: ${gcsFile.generation}`);
    console.log(`Content Type: ${gcsFile.contentType}`)
 
    //Reject images that are not jpeg or png files
    var fileExtension = "";
    if (gcsFile.contentType === 'image/jpg'){
        console.log('This is a JPEG file');
        fileExtension = '.jpg';
    } else if (gcsFile.contentType === 'image/png'){
        console.log('This is a PNG file.');
        fileExtension='.png';
    } else {
        //Delete the file
        await sourceBucket.file(gcsFile.name).delete(function(err,apiResponse){
            //This is the code that will execute after the file is deleted
            console.log(`Deleted File: ${gcsFile.name}`)
        });
        //Bail out of the could function entirely
        return false;
    }


};
  


