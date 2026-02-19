Rozdzial 1 (wymagane przez uczelnie):

- A) Wprowadzenie

- B) Cel Pracy

- C) Teza pracy

---

Rozdzial 2 - Wstep matematyczny 

- A) Charakterystyka hexagonu
  - Hexagon to uposledzone kolo
  - Jak najprosciej narysowac hexagon (trojkaty)
- B) Jak to robimy 
  - Triangle fan ? 
  - Opisanie konkretnych oznaczeń na przykladzie hexa
  - Wzory na wyliczanie sasiadow ?
- C) Matematyka koloru 
  - Czym jest oklch czym jest rgb 
  - Dlaczego oklch co to daje
  - Matematyka z "convertOklchToRgb"
  - Wyjaśnienie matematyki

---

Rozdzial 3 - Shadery:

- A) Opisanie czym sa shadery
  - Nie wiem czy to potrzebne ale jakies takie gowna z roznych autorow opisujacych zeby budowac bibliografie
  - Pokazanie "na sucho" -> vertex - wierzcholki, fragment - piksele (zdjecia) 
- B) Wyjaśnienie dlaczego chcemy korzystać z shaderów
  - Wydajnosc - gotowe silniki sa spoko, ale zalozenie jest ze ma byc wykurwiscie wydajne na skale jaka chcemy robic
    - a) Instancjonowanie 
    - b) Logika rysowania (np. przeliczanie koloru dla kazdego heksa w zaleznosci od pozycji piksela)
    - c) Zoom (no, że zawsze to będzie w chuj ostre)
- C) Opisanie w jaki sposób korzystamy z shaderów
  - Opisanie co u nas robi vertex 
    - a) wyznaczenie pozycji hexa na (r, col, mapWidth)
    - b) Zmiana na pozycje x, y
    - c) Wyliczenie pozycji wierzchołków ze stałych offsetów (dlaczego offsety a nie jakaś matma)
    - transformacja MVP 
  - Opisanie co u nas robi fragment 
    - a) Rozpakowanie masek 
    - b) Sprawdzenie pozycji piksela, żeby nadać kolor 
    - c) obliczanie krawędzi 
- D) Proces tworzenia shaderów, te wszystkie zadania
    - Dlaczego nie ma tam ifów
    - Dlaczego nie ma tam pętli
    - Dlaczzego zamist wyliczania pozycji mamy wektory przesuniecia
    - Robienie ramki w shaderze (to może chyba nawet być osobny punkt)
    - Kolory w shaderze
- E) Podsumowanie czyli gotowe shadery co robią


---

Rozdzial 3 - Generacja mapy:

- A) Jakie chcemy miec mapy, co chcemy osiagnac
- B) Jak do tego dojdziemy:
    - jak rysujemy konrketny ksztalt
    - dlaczego prostokat
    - funkcja parujaca
        - a) dlaczego row major
        - b) dlaczego nie z-curve
    - opisanie MapState jak z niego korzystamy, co tam sie dzieje
    - optymalizacja generowania (co usunieto, 5 s -> 70 ms)


---
Punkty tymczasowo bez rozdziału  


- Po kliknieciu zmiana koloru i masek -> 72ms do 0,5 ms
