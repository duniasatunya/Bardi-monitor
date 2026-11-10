' Menjalankan Bardi Monitor tanpa jendela hitam (layar penuh).
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = root
sh.Run "cmd /c node monitor.js --fullscreen >> """ & root & "\start.log"" 2>&1", 0, False
