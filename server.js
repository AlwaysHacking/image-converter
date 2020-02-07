const Koa = require("koa");
const webp = require("webp-converter");
const fs = require("fs");
const path = require("path");
const koaBody = require("koa-body");
const logger = require("koa-logger");
const serve = require("koa-static");

const app = new Koa();

app.use(logger());

app.use(koaBody({ multipart: true }));
app.use(serve(path.join(__dirname, "/public")));

app.use(async function(ctx, next) {
  // ignore non-POSTs
  if ("POST" != ctx.method) return await next();

  try {
    await new Promise((resolve, reject) => {
      const file = ctx.request.files.file;
      const savePath = path.join("./public", file.name);
      const reader = fs.createReadStream(file.path);
      const writer = fs.createWriteStream(savePath);
      const stream = reader.pipe(writer);
      stream.on("finish", async () => {
        await new Promise((resolve, reject) => {
          webp.dwebp(savePath, "./public/output.jpg", "-o", (status, error) => {
            if (status === 100) {
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
});
app.listen(3000);
