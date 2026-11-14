$code = @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public class ViaEncoderReader {
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

    public static string ReadEncoder(string path, byte layer, byte encoderIndex, byte direction) {
        SafeFileHandle handle = CreateFile(path, 0xC0000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
        if (handle.IsInvalid) return "OpenErr:" + Marshal.GetLastWin32Error();

        using (FileStream stream = new FileStream(handle, FileAccess.ReadWrite, 33, false)) {
            byte[] outBuf = new byte[33];
            outBuf[0] = 0x00;
            outBuf[1] = 0x14; // getDynamicEncoder
            outBuf[2] = layer;
            outBuf[3] = encoderIndex;
            outBuf[4] = direction;
            stream.Write(outBuf, 0, 33);
            stream.Flush();

            byte[] inBuf = new byte[33];
            stream.Read(inBuf, 0, 33);

            ushort keycode = (ushort)((inBuf[5] << 8) | inBuf[6]);
            string raw = BitConverter.ToString(inBuf, 0, 10);
            return string.Format("0x{0:X4} [raw: {1}]", keycode, raw);
        }
    }
}
'@

Add-Type -TypeDefinition $code
$path = '\\?\hid#vid_feed&pid_6001&mi_01#8&176112e4&0&0000#{4d1e55b2-f16f-11cf-88cb-001111000030}'

Write-Host "CCW:" ([ViaEncoderReader]::ReadEncoder($path, 0, 0, 0))
Write-Host "CW: " ([ViaEncoderReader]::ReadEncoder($path, 0, 0, 1))
