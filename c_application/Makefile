CC=gcc
CFLAGS=-Wall -Wextra -std=c99 -D_GNU_SOURCE
MSG_TARGET=msg_server
CALL_TARGET=call_server
FILE_TARGET=file_server
VIDEO_TARGET=video_receiver
MSG_SOURCE=msg_server.c
CALL_SOURCE=call_server.c
FILE_SOURCE=file_server.c
VIDEO_SOURCE=video_receiver.c

all: $(MSG_TARGET) $(CALL_TARGET) $(FILE_TARGET) $(VIDEO_TARGET)

$(MSG_TARGET): $(MSG_SOURCE)
	$(CC) $(CFLAGS) -o $(MSG_TARGET) $(MSG_SOURCE)

$(CALL_TARGET): $(CALL_SOURCE)
	$(CC) $(CFLAGS) -o $(CALL_TARGET) $(CALL_SOURCE)

$(FILE_TARGET): $(FILE_SOURCE)
	$(CC) $(CFLAGS) -o $(FILE_TARGET) $(FILE_SOURCE)

$(VIDEO_TARGET): $(VIDEO_SOURCE)
	$(CC) $(CFLAGS) -o $(VIDEO_TARGET) $(VIDEO_SOURCE)

# Legacy target for backward compatibility
sdr: $(MSG_TARGET)

clean:
	rm -f $(MSG_TARGET) $(CALL_TARGET) $(FILE_TARGET) $(VIDEO_TARGET) sdr a.out

.PHONY: clean all
