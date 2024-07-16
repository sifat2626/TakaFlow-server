const { readdirSync } = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const helmet = require("helmet");
const mongoose = require("mongoose");
require("dotenv").config();
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// middlewares
app.use(cors({
    origin: [
        "https://tietheknot-3a6f0.web.app",
        "http://localhost:5173"
    ],
    credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(cookieParser())

// routes middleware
readdirSync("./routes").map((r) =>
    app.use("/api/v1", require(`./routes/${r}`))
);

// server
const port = process.env.PORT || 8000;



// Connect to DB and start server
mongoose
    .connect(process.env.DATABASE)
    .then(() => {
        app.listen(port, () => {
            console.log(`Server Running on port ${port}`);
        });
    })
    .catch((err) => console.log(err));
