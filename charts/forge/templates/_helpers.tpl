{{/*
Expand the name of the chart.
*/}}
{{- define "forge.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "forge.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s" $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "forge.labels" -}}
helm.sh/chart: {{ include "forge.name" . }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels — API
*/}}
{{- define "forge.forgeApi.selectorLabels" -}}
app.kubernetes.io/name: forge-api
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels — Admin API
*/}}
{{- define "forge.adminApi.selectorLabels" -}}
app.kubernetes.io/name: forge-admin-api
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels — App Web
*/}}
{{- define "forge.forgeWeb.selectorLabels" -}}
app.kubernetes.io/name: forge-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels — Admin Web
*/}}
{{- define "forge.adminWeb.selectorLabels" -}}
app.kubernetes.io/name: forge-admin-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels — PostgreSQL
*/}}
{{- define "forge.postgresql.selectorLabels" -}}
app.kubernetes.io/name: forge-postgresql
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Return the PostgreSQL service hostname (always in the app namespace)
*/}}
{{- define "forge.postgresql.host" -}}
{{- printf "forge-postgresql.%s.svc.cluster.local" .Values.namespace }}
{{- end }}

{{/*
Return the PostgreSQL connection string (only for embedded mode)
*/}}
{{- define "forge.postgresql.connectionString" -}}
{{- printf "postgresql://%s:%s@%s:%d/%s" .Values.postgresql.username .Values.postgresql.password (include "forge.postgresql.host" .) (int .Values.postgresql.port) .Values.postgresql.database }}
{{- end }}

{{/*
Return the PostgreSQL Admin connection string (only for embedded mode)
*/}}
{{- define "forge.postgresql.adminConnectionString" -}}
{{- printf "postgresql://%s:%s@%s:%d/forge_admin" .Values.postgresql.username .Values.postgresql.password (include "forge.postgresql.host" .) (int .Values.postgresql.port) }}
{{- end }}
