# Catalogue Parity

Snapshot record coverage:

- Skilling level bands: 105
- PvM / bossing entries: 78
- Quests: 178
- Achievement diaries: 48
- Combat achievement tier/task records: 643
- Minigames: 151
- Ironman gathering records: 95
- Items and bonds: 29
- Account price references: 3

Implementation coverage:

- Catalogue card offerings carry nullable reference price fields and source keys.
- Skilling and PvM calculators receive deterministic reference methods.
- Product marketplace receives reference item/bond listings with manual-review availability.
- Gold receives a published reference revision while live stock/capacity remain zero.
- Custom builds, accounts, checkout, payments and historical task workflows remain separate.
