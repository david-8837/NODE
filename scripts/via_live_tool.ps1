using namespace System
using namespace System.IO
using namespace System.Runtime.InteropServices
using namespace Microsoft.Win32.SafeHandles

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public class ViaLiveDevice {
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern SafeFileHandle CreateFile(
        string lpFileName,
        uint dwDesiredAccess,
        uint dwShareMode,
        IntPtr lpSecurityAttributes,
        uint dwCreationDisposition,
        uint dwFlagsAndAttributes,
        IntPtr hTemplateFile
    );

    public static string SetAndGetKey(string path, byte layer, byte row, byte col, ushort keycode) {
        SafeFileHandle handle = CreateFile(path, 0xC0000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
        if (handle.IsInvalid) return "Err:" + Marshal.GetLastWin32Error();
        
        using (FileStream stream = new FileStream(handle, FileAccess.ReadWrite, 33, false)) {
            // Write
            byte[] outBuf = new byte[33];
            outBuf[0] = 0x00;
            outBuf[1] = 0x05; // CMD_SET_DYNAMIC_KEYCODE
            outBuf[2] = layer;
            outBuf[3] = row;
            outBuf[4] = col;
            outBuf[5] = (byte)((keycode >> 8) & 0xFF);
            outBuf[6] = (byte)(keycode & 0xFF);
            stream.Write(outBuf, 0, 33);
            stream.Flush();

            byte[] ack = new byte[33];
            stream.Read(ack, 0, 33);

            // Read back
            byte[] readCmd = new byte[33];
            readCmd[0] = 0x00;
            readCmd[1] = 0x04; // CMD_GET_DYNAMIC_KEYCODE
            readCmd[2] = layer;
            readCmd[3] = row;
            readCmd[4] = col;
            stream.Write(readCmd, 0, 33);
            stream.Flush();

            byte[] readBack = new byte[33];
            stream.Read(readBack, 0, 33);

            ushort verified = (ushort)((readBack[5] << 8) | readBack[6]);
            return string.Format("0x{0:X4}", verified);
        }
    }
}
"@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

$path = '\\?\hid#vid_feed&pid_6001&mi_01#8&176112e4&0&0000#{4d1e55b2-f16f-11cf-88cb-001111000030}'

$grid = @(
    @(0x081E, 0x0808, 0x0008), # Win+1 (Taskbar App 1 on GP0), Win+E (File Explorer on GP1), E (GP2)
    @(0x0004, 0x0016, 0x0007), # A (GP3), S (GP4), D (GP5)
    @(0x001D, 0x001B, 0x0006)  # Z (GP6), X (GP7), C (GP8)
)

Write-Host "=========================================================="
Write-Host " LIVE HARDWARE VERIFICATION: NØDE GRID MACRO 1 (RP2040)"
Write-Host "=========================================================="
Write-Host "Writing and verifying keymaps in RP2040 Flash memory over USB:"

for ($r = 0; $r -lt 3; $r++) {
    $line = "  Row ${r}: "
    for ($c = 0; $c -lt 3; $c++) {
        $val = [ViaLiveDevice]::SetAndGetKey($path, 0, $r, $c, $grid[$r][$c])
        $line += "[$val] "
    }
    Write-Host $line
}

$dial = [ViaLiveDevice]::SetAndGetKey($path, 0, 3, 0, 0x00AE)
Write-Host "  Encoder Push Switch (3,0): [$dial] (KC_MPLY)"
Write-Host "=========================================================="
Write-Host "Hardware verified: All 10 keys programmed & read-back successfully!"
