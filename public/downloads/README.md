# public/downloads/

Pliki `.apk` w tym folderze są celowo wyłączone z gita (`.gitignore`) — GitHub odrzuca
commity z plikami >100MB, a appka Androidowa już to przekracza.

**Jak to działa:**
- Lokalnie: plik `.apk` leży tu na dysku, serwer deweloperski go normalnie serwuje.
- Docelowo (produkcja): plik APK hostujemy w **GitHub Releases** tego repozytorium,
  a przycisk "Pobierz aplikację" na stronie logowania linkuje bezpośrednio do tamtego
  URL-a, zamiast do pliku w `public/`.

Jeśli klonujesz to repo od zera i chcesz przetestować przycisk pobierania lokalnie,
wrzuć tu plik `volleymanager.apk` ręcznie — nie będzie go po `git clone`.
