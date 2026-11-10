' Menjalankan Bardi Monitor CARA BIASA (tanpa mode kios, tanpa pengawas).
' Pakai ini kalau perlu perawatan: jendela bisa ditutup biasa dan program ikut berhenti.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = root
sh.Run "cmd /c node monitor.js --fullscreen >> """ & root & "\start.log"" 2>&1", 0, False
