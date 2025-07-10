# MANET C Servers Management Scripts

This directory contains scripts to manage the MANET C server applications.

## Scripts

### `start_all.sh`
Starts all MANET C servers in separate gnome-terminal windows.

**Usage:**
```bash
./start_all.sh
```

**What it does:**
- Opens a new terminal window for each C server application
- Runs the respective executable (`msg_server`, `call_server`, etc.)
- Keeps terminals open after servers exit for log review
- Provides clear status information for each server

**Servers started:**
- Message Server (`msg_server`) - Listens on `/tmp/msg_socket`
- Call Server (`call_server`) - Listens on `/tmp/call_socket`
- File Transfer Server (`file_server`) - Listens on `/tmp/file_socket`
- Video Receiver Server (`video_receiver`) - Listens on `/tmp/video_socket`

### `stop_all.sh`
Stops all running MANET C servers and cleans up socket files.

**Usage:**
```bash
./stop_all.sh
```

**What it does:**
- Finds and terminates all MANET server processes
- Removes socket files (`/tmp/*_socket`, `/tmp/video_pipe`)
- Provides status for each stop operation

## Building the Servers

Before using the scripts, make sure the C servers are compiled:

```bash
cd c_application
make clean
make
```

## Manual Operations

**Start individual server:**
```bash
cd c_application
./msg_server        # or call_server, file_server, video_receiver
```

**Stop individual server:**
```bash
pkill msg_server    # or call_server, file_server, video_receiver
```

**Check running servers:**
```bash
pgrep -f "msg_server|call_server|file_server|video_receiver"
```

## Extending the Scripts

To add a new server:
1. Add the executable name to the `SERVERS` array in both scripts
2. Update the server information section in `start_all.sh`
3. Add any new socket files to the cleanup section in `stop_all.sh`

## Troubleshooting

- **Permission denied**: Make sure scripts are executable: `chmod +x start_all.sh stop_all.sh`
- **Executable not found**: Build the servers with `make` in the `c_application` directory
- **Socket in use**: Run `./stop_all.sh` to clean up any leftover processes and sockets
