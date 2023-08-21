const express = require('express');
const app = express();
const bodyParser = require('body-parser');

//引用bodyParser
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
//设置跨域请求
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});


//接口
app.post('/generate', async function (req, res) {
    const result = generateBlobsData(req.body.blobs);
    res.status(200);
    res.json(result);
});

app.get('/test', async function (req, res) {
    res.status(200);
    res.json({data:'success'});
});

// 启动
app.listen(3000, '0.0.0.0', () => {
    console.log('Express server listening on port ');
});


// *********逻辑**********
const {
    blobToKzgCommitment, computeBlobKzgProof, loadTrustedSetup
} = require("c-kzg");
const {resolve} = require("path");
const {ethers} = require("ethers");

const SETUP_FILE_PATH = resolve(__dirname, "lib", "devnet7.txt");
loadTrustedSetup(SETUP_FILE_PATH);

function computeVersionedHash(commitment, blobCommitmentVersion) {
    const computedVersionedHash = new Uint8Array(32);
    computedVersionedHash.set([blobCommitmentVersion], 0);
    const hash = ethers.getBytes(ethers.sha256(commitment));
    computedVersionedHash.set(hash.subarray(1), 1);
    return computedVersionedHash;
}

function generateBlob(blob) {
    const commitment = blobToKzgCommitment(blob);
    const commitmentHash = computeVersionedHash(commitment, 0x01);
    const proof = computeBlobKzgProof(blob, commitment);
    return {
        commitmentHash: ethers.hexlify(commitmentHash),
        commitment: ethers.hexlify(commitment),
        proof: ethers.hexlify(proof)
    }
}

function generateBlobsData(blobs) {
    const versionedHashes = [];
    const commitments = [];
    const proofs = [];
    try {
        if (Array.isArray(blobs)) {
            for (let i = 0; i < blobs.length; i++) {
                const blob = ethers.getBytes(blobs[i]);
                const {commitmentHash, commitment, proof} = generateBlob(blob);
                versionedHashes.push(commitmentHash);
                commitments.push(commitment);
                proofs.push(proof);
            }
        } else if (ethers.isHexString(blobs)) {
            const blob = ethers.getBytes(blobs);
            const {commitmentHash, commitment, proof} = generateBlob(blob);
            versionedHashes.push(commitmentHash);
            commitments.push(commitment);
            proofs.push(proof);
        }
    } catch (e) {}
    return {
        versionedHashes,
        commitments,
        proofs
    }
}
