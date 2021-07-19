import firebase from "firebase/app";
import "firebase/storage";
import "firebase/database";
import { InfluxDB, Point } from "@influxdata/influxdb-client";

// DOM selectors
const DOMSelectors = {
    img: document.getElementById("main-img"),
    imgClick: document.querySelector(".img-container > a"),
    submit: document.getElementById("submit"),
    aArr: document.getElementById("aArr"),
    aMot: document.getElementById("aMot"),
    vBatt: document.getElementById("vBatt"),
    queue: document.getElementById("queue"),
    skip: document.getElementById("skip"),
    skipAll: document.getElementById("skip-all"),
};
// set current image on page
const setImg = (imgUrl) => {
    DOMSelectors.img.src = imgUrl;
    DOMSelectors.imgClick.href = imgUrl;
};

const clearImg = () => {
    DOMSelectors.img.src = "";
    DOMSelectors.imgClick.href = "";
};

const clearInputs = () => {
    DOMSelectors.aArr.value = "";
    DOMSelectors.aMot.value = "";
    DOMSelectors.vBatt.value = "";
};

// === Firebase ===
// firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA5E_HWaE4GXmq8RArbRzaRw_bgxmnFxZ8",
    authDomain: "failemetry-part-2.firebaseapp.com",
    projectId: "failemetry-part-2",
    storageBucket: "failemetry-part-2.appspot.com",
    messagingSenderId: "335163718065",
    appId: "1:335163718065:web:43ccbfbd96d127181ea590",
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

// references to firebase locations
const root = firebase.storage().ref();
const tickle = firebase.database().ref();

// === InfluxDB ===
// init influxDB connection
const token =
    "yxCYhp_0BmOzZlhb5OSs2hJU6hfNlA2AcxreA7W-Ti9m1OKQOXBBKBLasGgS0NiXsQBTbAASJfa132I0eEYJKg==";
const org = "SITHS Solar Car";
const bucket = "2021 Failemetry 2.0";
const client = new InfluxDB({
    url: "https://us-east-1-1.aws.cloud2.influxdata.com",
    token: token,
});

// reference to influx write api
const writeApi = client.getWriteApi(org, bucket, "ms");

// write value to point
const dataToPoint = (name, value, timestamp) => {
    const point = new Point()
        .measurement("SolarCarMetrics")
        .floatField(name, value)
        .timestamp(timestamp);
    writeApi.writePoint(point);
};

// submit values for input to DB
const uploadToInflux = (aArr, aMot, vBatt, timestamp) => {
    if (aArr)
        dataToPoint("arrayCurrent", parseFloat(aArr), parseInt(timestamp));
    if (aMot)
        dataToPoint("motorCurrent", parseFloat(aMot), parseInt(timestamp));
    if (vBatt)
        dataToPoint("battVoltage", parseFloat(vBatt), parseInt(timestamp));
    // save written points onto DB
    writeApi.flush();
};

// === imgUrl Local Storage ===
// init array of image urls, or get existing stored array
let imgs, storedImgs;
storedImgs = localStorage.getItem("imgs");
if (storedImgs === null) imgs = [];
else imgs = JSON.parse(storedImgs);

// add image url to array and push to local storage
const addImgToLocal = (imgUrl, tickle) => {
    imgs.push({ imgUrl, tickle });
    updateLocal(imgs);
    DOMSelectors.queue.innerHTML = imgs.length;
};

// get current image url
const currentImg = () => imgs[0];

// get next image url, delete current
const nextImg = () => {
    const img = imgs.shift();
    updateLocal(imgs);
    DOMSelectors.queue.innerHTML = imgs.length;
    root.child(`${img.tickle}.jpg`).delete();
    if (currentImg()) setImg(currentImg().imgUrl);
    else clearImg();
};

// skip all images
const skipAll = () => {
    imgs.forEach((img) => {
        root.child(`${img.tickle}.jpg`).delete();
    });
    imgs = [];
    updateLocal(imgs);
    clearImg();
    DOMSelectors.queue.innerHTML = imgs.length;
};

// update local storage
const updateLocal = (arr) => {
    localStorage.setItem("imgs", JSON.stringify(arr));
};

function main() {
    // update queue length
    DOMSelectors.queue.innerHTML = imgs.length;
    // set current image if there is any
    if (currentImg()) setImg(currentImg().imgUrl);
    console.log(currentImg());

    // event listener for clicking the submit button
    DOMSelectors.submit.onclick = () => {
        uploadToInflux(
            DOMSelectors.aArr.value,
            DOMSelectors.aMot.value,
            DOMSelectors.vBatt.value,
            Date.now()
            // currentImg().tickle
        );
        clearInputs();
        // shift to next image
        nextImg();
    };

    // event listener for skipping one image
    DOMSelectors.skip.onclick = () => {
        // if (confirm("Really Skip This Image?")) nextImg();
        nextImg();
    };

    // event listener for skipping all images
    DOMSelectors.skipAll.onclick = () => {
        if (confirm("Really Skip All Images?")) skipAll();
    };

    // set firebase event listener on img data addition
    tickle.on("value", (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.val();
        // add image info to localstorage and update bg appropriately
        if (!imgs.find((img) => img.tickle === data.tickle))
            addImgToLocal(data.currentImgUrl, data.tickle);
        setImg(currentImg().imgUrl);
        // delete data once listened
        tickle.remove();
    });

    window.onbeforeunload = () => {
        return "Jake sit down and keep doing data entry >:)"
    }
}
main();
