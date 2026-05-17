# Baza pitanja

Izvor: servisi.euprava.gov.rs/autoskole (QuestionsPractice).

## Fajlovi

- `podoblastX-Y.json` — pitanja po podoblasti
- `slike/` — slike po podoblastima (ako postoje)
- `counts.json` — generiše `npm run generate-counts`

## JSON

```json
{
  "meta": {
    "topicId": "1",
    "topicName": "...",
    "subtopicId": "1-1",
    "subtopicName": "...",
    "questionCount": 8,
    "source": "servisi.euprava.gov.rs/autoskole",
    "extracted": "2025-03-19"
  },
  "questions": [
    {
      "id": 1,
      "text": "...",
      "textShort": "...",
      "correctAnswerCount": 1,
      "answers": [{ "text": "...", "correct": true }],
      "correctAnswers": ["..."],
      "explanation": null,
      "image": "slike/podoblast1-1-1.jpg"
    }
  ]
}
```

`textShort` se puni pri ekstrakciji (~50 znakova, za modale).

## Ekstrakcija

1. Sačuvaj stranice kao `1.html`, `2.html`, … u `podoblastX-Y` (ili `podoblast-X-Y`).
2. `npm run extract -- podoblast1-2`
3. Obriši izvorni folder ako više ne treba: `rm -rf podoblast1-2`

## Ručne slike (N.jpeg u folderu sa HTML-om)

```bash
npm run sync-images
npm run sync-images -- podoblast-5-11
```

Kopira u `slike/podoblastX-Y-N.ext` i postavlja `image` u JSON-u.

## Različite slike po pitanju

Euprava često servira isti URL; browser kešira prvu sliku ako snimate sve iz jednog taba. Pre svakog pitanja: novi Incognito prozor, ili DevTools → Network → Disable cache, ili hard refresh (Cmd+Shift+R), pa „Sačuvaj kao“ za to pitanje.
