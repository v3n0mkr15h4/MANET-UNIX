CC=gcc
CFLAGS=-Wall -Wextra -std=c99
MSG_TARGET=msg_server
CALL_TARGET=call_server
FILE_TARGET=file_server
MSG_SOURCE=msg_server.c
CALL_SOURCE=call_server.c
FILE_SOURCE=file_server.c

all: $(MSG_TARGET) $(CALL_TARGET) $(FILE_TARGET)

$(MSG_TARGET): $(MSG_SOURCE)
	$(CC) $(CFLAGS) -o $(MSG_TARGET) $(MSG_SOURCE)

$(CALL_TARGET): $(CALL_SOURCE)
	$(CC) $(CFLAGS) -o $(CALL_TARGET) $(CALL_SOURCE)

$(FILE_TARGET): $(FILE_SOURCE)
	$(CC) $(CFLAGS) -o $(FILE_TARGET) $(FILE_SOURCE)

# Legacy target for backward compatibility
sdr: $(MSG_TARGET)

clean:
	rm -f $(MSG_TARGET) $(CALL_TARGET) $(FILE_TARGET) sdr a.out

.PHONY: clean all
