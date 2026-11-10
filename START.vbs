' Menjalankan Bardi Monitor MODE KIOS: layar penuh tanpa tombol silang, dijaga otomatis.
' Kalau jendela tertutup, program dibuka lagi sendiri. Untuk berhenti: tombol "Hentikan pemantauan" di halaman laporan.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = root
sh.Run "cmd /c node guard.js >> """ & root & "\start.log"" 2>&1", 0, False
