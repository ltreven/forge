{{- define "edev.name" -}}
{{- default .Chart.Name .Values.profile.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "edev.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "edev.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "edev.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" -}}
{{- end -}}
