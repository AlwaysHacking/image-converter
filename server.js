const Koa = require("koa");
const webp = require("webp-converter");
const fs = require("fs");
const path = require("path");
const koaBody = require("koa-body");
const logger = require("koa-logger");
const serve = require("koa-static");
const got = require("got");
const FileType = require("file-type");

const app = new Koa();

app.use(logger());

app.use(koaBody({ multipart: true }));
app.use(serve(path.join(__dirname, "/public")));

function transWebpToJpg(res, name, resolve, reject) {
  const savePath = path.join("./public", name);
  const writer = fs.createWriteStream(savePath);
  const stream = res.pipe(writer);
  stream.on("finish", async () => {
    await new Promise((resolve, reject) => {
      webp.dwebp(savePath, "./public/output.jpg", "-o", (status, error) => {
        if (status === "100") {
          resolve();
        } else {
          console.log("Convert webp failed.");
          console.log(error);
          reject(error);
        }
      });
    });
    resolve(200);
  });
}

app.use(async function(ctx, next) {
  if ("POST" === ctx.method) {
    try {
      await new Promise((resolve, reject) => {
        const file = ctx.request.files.file;
        const res = fs.createReadStream(file.path);
        transWebpToJpg(res, file.name, resolve, reject);
      });
      ctx.body = {
        status: 200,
        code: 1,
        message: "Upload and convert success!"
      };
    } catch (error) {
      ctx.body = {
        status: 200,
        code: 0,
        message: "Failed!"
      };
    }
  }
  const imageUrl = ctx.request.query.image_url;
  if ("GET" === ctx.method && imageUrl) {
    const fetchStream = got.stream(imageUrl);
    const fileType = await FileType.fromStream(fetchStream);
    if (fileType.ext === "webp") {
      await new Promise((resolve, reject) => {
        transWebpToJpg(got.stream(imageUrl), "output.jpg", resolve, reject);
      });
    } else {
      await new Promise(resolve => {
        const writeStream = fs.createWriteStream("./public/output.jpg");
        fetchStream.pipe(writeStream).on("finish", resolve);
      });
    }
    ctx.body = {
      status: 200,
      code: 1,
      message: "Save and convert success!"
    };
  }
});
app.listen(3000);
