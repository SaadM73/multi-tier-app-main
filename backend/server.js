const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let listings = [
  {
    id: 1,
    title: "Most World Cup Wins",
    price: 5,
    category: "Records",
    seller: "Football Fan",
    description:
      "Brazil holds the record with 5 FIFA World Cup titles (1958, 1962, 1970, 1994, 2002).",
    posted: "2026-04-20",
  },
  {
    id: 2,
    title: "Fastest Goal in History",
    price: 3,
    category: "Records",
    seller: "Stats Guru",
    description:
      "The fastest goal in professional football was scored by Justin Meram in 2.1 seconds (Iraq vs. Yemen, 2016).",
    posted: "2026-04-21",
  },
  {
    id: 3,
    title: "Top Scorer in El Clasico",
    price: 4,
    category: "Players",
    seller: "Madridista",
    description:
      "Lionel Messi holds the record with 26 goals in Barcelona vs Real Madrid matches.",
    posted: "2026-04-22",
  },
  {
    id: 4,
    title: "Longest Winning Streak",
    price: 2,
    category: "Records",
    seller: "Stat Master",
    description:
      "Real Madrid won 22 consecutive games in 2014-15 season under Carlo Ancelotti.",
    posted: "2026-04-23",
  },
];
let nextId = 5;

const categories = [
  "Records",
  "Players",
  "Teams",
  "Tactics",
  "History",
  "Leagues",
];

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Football Knowledge Hub API running!" });
});

app.get("/api/listings", (req, res) => {
  const { category } = req.query;
  if (category && category !== "All") {
    return res.json(listings.filter((l) => l.category === category));
  }
  res.json(listings);
});

app.post("/api/listings", (req, res) => {
  const { title, price, category, seller, description } = req.body;
  if (!title || !price || !category || !seller) {
    return res
      .status(400)
      .json({ error: "title, price, category and seller are required" });
  }
  const listing = {
    id: nextId++,
    title,
    price: Number(price),
    category,
    seller,
    description: description || "",
    posted: new Date().toISOString().split("T")[0],
  };
  listings.push(listing);
  res.status(201).json(listing);
});

app.get("/api/categories", (req, res) => {
  res.json(categories);
});

app.listen(PORT, () => {
  console.log(`Football API running on port ${PORT}`);
});
