const Koa = require("koa");
const webp = require("webp-converter");
const fs = require("fs");
const path = require("path");
const koaBody = require("koa-body");
const logger = require("koa-logger");
const serve = require("koa-static");
const got = require("got");

const app = new Koa();

app.use(logger());

app.use(koaBody({ multipart: true }));
app.use(serve(path.join(__dirname, "/public")));

function transResToWebp(res, name, resolve, reject) {
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
  setTimeout(() => {
    console.log("Timeout!");
    reject();
  }, 30000);
}

app.use(async function(ctx, next) {
  if ("POST" === ctx.method) {
    try {
      await new Promise((resolve, reject) => {
        const file = ctx.request.files.file;
        const res = fs.createReadStream(file.path);
        transResToWebp(res, file.name, resolve, reject);
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
  if ("GET" === ctx.method) {
    const imageUrl = ctx.request.query.image_url;
    await new Promise((resolve, reject) => {
      transResToWebp(got.stream(imageUrl), "output.jpg", resolve, reject);
    });
    ctx.body = {
      status: 200,
      code: 1,
      message: "Save and convert success!"
    };
  }
});
app.listen(3000);
