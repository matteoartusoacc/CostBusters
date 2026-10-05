#!/usr/bin/env bash
# Hook PostToolUse (Edit|Write): fa rispettare il confine educazione/consulenza
# descritto in docs/requirements.md §5. CostBusters può dire quanto costa uno
# strumento finanziario, mai se convenga: una frase di giudizio che finisce in
# un testo visibile all'utente trasformerebbe l'educazione finanziaria in
# consulenza non abilitata.
#
# Gira DOPO la scrittura, non prima: serve il file su disco per poterlo leggere.
# Quindi non impedisce la modifica, la intercetta subito dopo — exit 2 riporta il
# motivo su stderr e il problema torna a Claude, che corregge prima di procedere.
# Exit 0 = nessun rilievo.
# Volutamente senza jq e senza Node (non installato su questa macchina).

payload=$(cat)

# Estrae il percorso del file dal JSON dell'hook senza un parser JSON.
file=$(printf '%s' "$payload" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
[ -z "$file" ] && exit 0

# Normalizza i separatori di Windows e considera solo i file del prodotto.
norm=$(printf '%s' "$file" | tr '\\' '/')
case "$norm" in
  */app/*) ;;
  *) exit 0 ;;
esac
case "$norm" in
  */app/demo/samples/*) exit 0 ;;  # finti prospetti: il linguaggio commerciale è legittimo
esac
[ -f "$file" ] || exit 0

# Giudizi di convenienza e raccomandazioni. Le forme flesse sono incluse di
# proposito: cercare solo "conviene" lascia passare "conveniente".
pattern='conviene|conveniente|convenienza|vale la pena|buon investimento|ottimo investimento|troppo caro|ti consigl|le consigl|vi consigl|dovresti|conviene comprare|miglior|peggior'

hits=$(grep -n -i -E "$pattern" "$file" 2>/dev/null \
  | grep -v -i -E 'non dice se conviene|non consiglia|non classifica|migliori o peggiori|nessun giudizio|mai se convenga|confine' \
  || true)

[ -z "$hits" ] && exit 0

{
  echo "Confine educazione/consulenza: trovate espressioni di giudizio in $norm"
  echo "$hits" | while IFS= read -r line; do echo "  $line"; done
  echo
  echo "CostBusters mostra quanto costa uno strumento, non se convenga"
  echo "(docs/requirements.md §5). Riformula senza giudizi di convenienza,"
  echo "raccomandazioni di acquisto o vendita, o confronti migliore/peggiore."
  echo "Se l'occorrenza nega il giudizio (es. \"non dice se conviene\") aggiungi"
  echo "l'eccezione in .claude/hooks/controlla-confine.sh invece di aggirare il controllo."
} >&2

exit 2
