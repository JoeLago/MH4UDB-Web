mh4u.db: mh4u.sql
	sqlite3 $@ < $<

.PHONY: clean
clean:
	rm -f mh4u.db
