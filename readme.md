# ABI
### mapStateABI

```mermaid
flowchart LR
    subgraph MapStateABI [Struktura Map State ABI]
        A[Wysokosc mapy - 2 Bajty max 32767]:::blue
        B[Szerokosc mapy - 2 Bajty max 32767]:::brown
        C[Ilosc graczy - 2 Bajty max 32767]:::green
        D[Aktualny gracz - 2 Bajty max 32767]:::teal
        E[Aktualna tura - 4 Bajty max 4294967295]:::lightblue
        F[Ilosc prowincji - 4 Bajty max 1067720976]:::pink
        G[Stany hexow - 1 Bajt * ilosc hexow]:::red
        H[Kolory hexow - 2 Bajty * ilosc hexow lub 1 Bajt * ilosc hexow]:::violet
        I[Stan finansowy prowincji - 4 Bajty * ilosc prowincji]:::darkgreen
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


### generateMap



```mermaid
block-beta
    ySize xSize playerCount treeChance proviceCount space mapState
    ySize xSize playerCount treeChance proviceCount --> mapState
```

ySize is a variable responsible for height of the map

xSize is a variable responsible for width of the map 

playerCount is a variable responsible for number of players in current game


