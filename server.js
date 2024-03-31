const epxress = require("express");
require("dotenv").config();

const app = express();

app.use(epxress.json);

app.get("/api", (req, res) => {
  res
    .status(200)
    .json({ message: "Welcome to the Google and Outlook mail parser API!" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("listening on port", PORT);
});
