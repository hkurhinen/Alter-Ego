var program = require('commander');
var promptly = require('promptly');
var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
var config = require('./config');
var haikunate = require('haikunator');
var fs = require('fs');

function encrypt(text, password){
  var cipher = crypto.createCipher(algorithm, password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(text, password){
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

function initializeKeyFile(fileName){
  promptly.password('Password for keyfile: ', function (passErr, password) {
    if (passErr) throw passErr;
    fs.writeFile(fileName, encrypt('{}', password), function (writeErr) {
      if (writeErr) throw writeErr;
      console.log('Key file: '+fileName+' generated.');
    });
  });
}

function generateAlterEgo(name, keyFile){
  fs.readFile(keyFile, 'utf8', function (readErr, data) {
    if (readErr) throw readErr;
    promptly.password('Password for keyfile: ', function (passErr, password) {
      if (passErr) throw passErr;
      var egos = JSON.parse(decrypt(data, password));
      var alterEgo = haikunate({tokenLength: 0});
      while(egos[alterEgo]){
        alterEgo = haikunate({tokenLength: 0});
      }
      egos[alterEgo] = name;
      fs.writeFile(keyFile, encrypt(JSON.stringify(egos), password), function (writeErr) {
        if (writeErr) throw writeErr;
        console.log('Alter ego: '+alterEgo+' generated for '+name);
      });
    });
  });
}

function decodeFile(keyFile, inputFile){
  fs.readFile(keyFile, 'utf8', function (keyErr, keyData) {
    if (keyErr) throw keyErr;
    promptly.password('Password for keyfile: ', function (passErr, password) {
      if (passErr) throw passErr;
      var egos = JSON.parse(decrypt(keyData, password));
      fs.readFile(inputFile, 'utf8', function (inputErr, data) {
        if (inputErr) throw inputErr;
        for (var ego in egos) {
          if (egos.hasOwnProperty(ego)) {
            var name = egos[ego];
            var pattern = new RegExp(ego, 'g');
            data = data.replace(pattern, name);
          }
        }
        fs.writeFile(inputFile+'_decoded', data, function (writeErr) {
          if (writeErr) throw writeErr;
        });
      });
    });
  });
}

function askInputFile(keyFile){
  promptly.prompt('Input file that will be decoded:', function(err, file){
    if(err) throw err;
    decodeFile(keyFile, file);
  });
}

program
  .version('0.0.1')
  .option('-n, --new', 'Initialize new key file')
  .option('-d, --decode', 'Function in decode mode')
  .option('-i, --input-file [file]', 'File that will be decoded when in decode mode', '')
  .option('-k, --key-file [file]', 'Key file that will be used for decoding or to which new alter ego will be added', '')
  .parse(process.argv);

if(program.new) {
  promptly.prompt('Name of the new key file:', function(fileErr, file){
    if(fileErr) throw fileErr;
    initializeKeyFile(file);
  });
}else if(program.decode){
    if(program.keyFile || config.key_file){
      var keyFile = program.keyFile ? program.keyFile : config.key_file;
      if(program.InputFile){
        decodeFile(keyFile, program.InputFile);
      }else{
        askInputFile(keyFile);
      }
    }else{
      promptly.prompt('Key file that will be used to decode document:', function(fileErr, file){
        if(fileErr) throw fileErr;
        if(program.InputFile){
          decodeFile(file, program.InputFile);
        }else{
          askInputFile(file);
        }
      });
    }
}else{
  promptly.prompt('Name of the person that alter ego will be generated:', function(nameErr, name){
    if(nameErr) throw nameErr;
    if(program.keyFile || config.key_file){
      var keyFile = program.keyFile ? program.keyFile : config.key_file;
      generateAlterEgo(name, keyFile);
    }else{
      promptly.prompt('Key file that alter ego will be added to:', function(fileErr, file){
        if(fileErr) throw fileErr;
        generateAlterEgo(name, file);
      });
    }  
  });
}