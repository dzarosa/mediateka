# HEVC / H.265 Anpassung

Diese Version erkennt HEVC/H.265-, MOV- und M4V-Videos auch dann korrekt, wenn iOS/Android oder der Browser keinen brauchbaren MIME-Type liefert.

Geändert wurden:

- Upload akzeptiert zusätzlich `.mov`, `.mp4`, `.m4v`, `.hevc`, `.h265` explizit.
- MIME-Type wird anhand der Dateiendung normalisiert (`video/quicktime`, `video/mp4`, `video/hevc`).
- Cloud-Run-Proxy liefert den korrigierten Content-Type zurück, damit Safari/iOS und unterstützte Android/Windows-Browser HEVC korrekt erkennen können.
- Galerie klassifiziert HEVC/MOV-Dateien auch dann als Video, wenn Google Drive `application/octet-stream` meldet.
- Video-Detailansicht verwendet ein `<source>` mit korrektem MIME-Type und zeigt bei fehlendem HEVC-Decoder eine verständliche Meldung statt eines leeren Players.

Wichtig: Diese Anpassung behebt Erkennung und Auslieferung. Sie transkodiert HEVC nicht. Safari/iPhone/iPad unterstützen HEVC nativ; Chrome/Edge/Firefox können je nach Betriebssystem, Hardware und installiertem Codec nur teilweise unterstützen. Für garantiertes Abspielen auf jedem Gerät wäre zusätzlich eine serverseitige Konvertierung nach H.264/MP4 oder AV1/WebM nötig.
