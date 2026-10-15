package layout

import (
	"strconv"
	"time"
)

// version changes on every restart, so browsers fetch fresh CSS and JS.
var version = strconv.FormatInt(time.Now().Unix(), 36)

// asset returns a local asset's URL with the version appended.
func asset(path string) string {
	return path + "?v=" + version
}
