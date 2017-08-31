package version

import (
	"github.com/aisk/logp"
)

// Version is lean-cli's version.
const Version = "0.14.0"

func PrintCurrentVersion() {
	logp.Info("当前命令行工具版本：", Version)
}
