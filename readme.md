# ABI
### mapStateABI

```mermaid
flowchart LR
    subgraph mapStateABI
        A[Map height - <br> 2 Bytes]:::blue
        B[Map width - <br> 2 Bytes]:::brown
        C[Player count - <br> 2 Bytes]:::green
        D[Current player - <br> 2 Bytes]:::teal
        E[Current round - <br> 4 Bytes]:::lightblue
        F[Province count - <br> 4 Bytes]:::pink
        G[Hex state <br> 1 Byte * hex count]:::red
        H[Hex color - <br> 2 Bytes * hex count <br> 1 Byte * hex count]:::violet
        I[Hex finance state - <br> 4 Bytes * province count]:::darkgreen
    end

    classDef blue fill:#4da6ff,stroke:#000,color:#fff;
    classDef brown fill:#996633,stroke:#000,color:#fff;
    classDef green fill:#339966,stroke:#000,color:#fff;
    classDef teal fill:#006666,stroke:#000,color:#fff;
    classDef lightblue fill:#99ccff,stroke:#000,color:#000;
    classDef pink fill:#ff99cc,stroke:#000,color:#000;
    classDef red fill:#ff6666,stroke:#000,color:#000;
    classDef violet fill:#ffccff,stroke:#000,color:#000;
    classDef darkgreen fill:#009933,stroke:#000,color:#fff;
```
### Map State ABI – Memory Layout

The diagram above represents the memory block responsible for storing the **Map State**.  
Each cell corresponds to a specific piece of information about the map, players, or game state.

| Field                | Size (Bytes) | Description                                                                 | Max Value / Range                  |
|-----------------------|--------------|-----------------------------------------------------------------------------|------------------------------------|
| **Map height**        | 2            | Number of rows (vertical size of the map).                                  | 32,767 (signed 16-bit)             |
| **Map width**         | 2            | Number of columns (horizontal size of the map).                             | 32,767 (signed 16-bit)             |
| **Player count**      | 2            | Number of players in the game.                                              | 32,767 (signed 16-bit)             |
| **Current player**    | 2            | Index of the currently active player.                                       | 32,767 (signed 16-bit)             |
| **Current round**     | 4            | Current round/turn number.                                                  | 4,294,967,295 (unsigned 32-bit)    |
| **Province count**    | 4            | Number of provinces (groups of hexes).                                      | 1,067,720,976 (unsigned 32-bit)    |
| **Hex state**         | 1 * (height × width) | Stores the state of each hex tile (terrain/building/unit).                   | Max size: 1,073,676,289 bytes ≈ 1.07 GB |
| **Hex color**         | 2 * (height × width)<br>or 1 * (height × width) | Stores the color/ownership of each hex tile. Can be stored as 2 bytes or 1 byte per hex. | Max size: 2,147,352,578 bytes ≈ 2.15 GB (2-byte mode)<br>1,073,676,289 bytes ≈ 1.07 GB (1-byte mode) |
| **Hex finance state** | 4 * province count | Stores the financial state (gold/money) of each province.                   | -2,147,483,648 to 2,147,483,647 (signed 32-bit) |
---

### Hex State Legend

Each hex tile is represented by **1 byte** that encodes its state:

- `0` – Water
- `1` – Empty
- `2` – Castle
- `3` – House
- `4` – Watchtower
- `5` – Keep tower
- `6` – Peasant (ready)
- `7` – Spearman (ready)
- `8` – Mercenary (ready)
- `9` – Knight (ready)
- `10` – Peasant (break)
- `11` – Spearman (break)
- `12` – Mercenary (break)
- `13` – Knight (break)
- `14` – Cavalry
- `15` – Tree
### generateMap



```mermaid
block-beta
    ySize xSize playerCount treeChance proviceCount space mapState
    ySize xSize playerCount treeChance proviceCount --> mapState
```

ySize is a variable responsible for height of the map

xSize is a variable responsible for width of the map 

playerCount is a variable responsible for number of players in current game


