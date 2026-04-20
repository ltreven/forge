package resources

import (
	"regexp"
	"strings"

	forgev1alpha1 "github.com/ltreven/forge/controller/api/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/utils/ptr"
)

const (
	// Gateway port exposed by openclaw inside the container (loopback only).
	gatewayPort = int32(18789)
)

// AgentDeployment builds the Deployment for a ForgeAgent CR.
//
// agentImage is the full image reference (repo:tag) passed from the controller config.
// pullPolicy is the ImagePullPolicy string (Always|IfNotPresent|Never).
// If the CR spec overrides these, the CR values take precedence.
func AgentDeployment(cr *forgev1alpha1.Agent, ownerRef *metav1.OwnerReference, agentImage, pullPolicy string) *appsv1.Deployment {
	image, policy := resolveImage(cr, agentImage, pullPolicy)
	fullImage := image

	// Resource defaults — overridden by CR spec if present
	requests := corev1.ResourceList{
		corev1.ResourceCPU:    resource.MustParse("250m"),
		corev1.ResourceMemory: resource.MustParse("512Mi"),
	}
	limits := corev1.ResourceList{
		corev1.ResourceCPU:    resource.MustParse("1000m"),
		corev1.ResourceMemory: resource.MustParse("2Gi"),
	}
	if cr.Spec.Resources != nil {
		if v, ok := cr.Spec.Resources.Requests["cpu"]; ok {
			requests[corev1.ResourceCPU] = resource.MustParse(v)
		}
		if v, ok := cr.Spec.Resources.Requests["memory"]; ok {
			requests[corev1.ResourceMemory] = resource.MustParse(v)
		}
		if v, ok := cr.Spec.Resources.Limits["cpu"]; ok {
			limits[corev1.ResourceCPU] = resource.MustParse(v)
		}
		if v, ok := cr.Spec.Resources.Limits["memory"]; ok {
			limits[corev1.ResourceMemory] = resource.MustParse(v)
		}
	}

	// Model env vars
	modelProvider := "openai"
	modelName := "gpt-4.1"
	if cr.Spec.Model != nil {
		if cr.Spec.Model.Provider != "" {
			modelProvider = cr.Spec.Model.Provider
		}
		if cr.Spec.Model.Name != "" {
			modelName = cr.Spec.Model.Name
		}
	}

	// Shared env vars (non-secret)
	sharedEnv := []corev1.EnvVar{
		{Name: "HOME", Value: "/home/node"},
		{Name: "OPENCLAW_CONFIG_DIR", Value: "/home/node/.openclaw"},
		{Name: "ACTIVE_PROVIDER", Value: modelProvider},
		{Name: "ACTIVE_MODEL_NAME", Value: modelName},
		{Name: "AGENT_PROFILE", Value: cr.Spec.Profile},
		{Name: "AGENT_NAME", Value: cr.Spec.AgentName},
		{Name: "AGENT_OPERATOR_NAME", Value: cr.Spec.OperatorName},
	}

	// Secret-sourced env vars from credentialsSecretRef
	secretRef := cr.Spec.CredentialsSecretRef
	secretEnv := []corev1.EnvVar{
		envFromSecret("TELEGRAM_BOT_TOKEN", secretRef, "TELEGRAM_BOT_TOKEN"),
		envFromSecret("OPENCLAW_GATEWAY_TOKEN", secretRef, "OPENCLAW_GATEWAY_TOKEN"),
		envFromSecret("OPENAI_API_KEY", secretRef, "OPENAI_API_KEY"),
		envFromSecret("GEMINI_API_KEY", secretRef, "GEMINI_API_KEY"),
		envFromSecret("LINEAR_API_KEY", secretRef, "LINEAR_API_KEY"),
		envFromSecret("LINEAR_ENABLED", secretRef, "LINEAR_ENABLED"),
		envFromSecret("GITHUB_PERSONAL_ACCESS_TOKEN", secretRef, "GITHUB_PERSONAL_ACCESS_TOKEN"),
		envFromSecret("GITHUB_ENABLED", secretRef, "GITHUB_ENABLED"),
		envFromSecret("GITHUB_AUTH_MODE", secretRef, "GITHUB_AUTH_MODE"),
	}

	initEnv := append(sharedEnv, secretEnv...)
	mainEnv := append(sharedEnv, secretEnv...)
	mainEnv = append(mainEnv, corev1.EnvVar{Name: "NODE_ENV", Value: "production"})

	// Volume definitions
	volumes := []corev1.Volume{
		{
			Name: "openclaw-home",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: cr.Name + "-state",
				},
			},
		},
		{
			Name: "bootstrap",
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{Name: cr.Name + "-bootstrap"},
					DefaultMode:          ptr.To(int32(0755)),
				},
			},
		},
		{Name: "tmp", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
		{Name: "npm-cache", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
	}

	// Standard volume mounts
	stateMounts := []corev1.VolumeMount{
		{Name: "openclaw-home", MountPath: "/home/node/.openclaw"},
		{Name: "tmp", MountPath: "/tmp"},
		{Name: "npm-cache", MountPath: "/home/node/.npm"},
	}

	initMounts := append(stateMounts,
		corev1.VolumeMount{Name: "bootstrap", MountPath: "/bootstrap"},
	)

	// Non-root security context (mirrors existing Helm chart)
	nonRoot := &corev1.SecurityContext{
		RunAsNonRoot:             ptr.To(true),
		RunAsUser:                ptr.To(int64(1000)),
		RunAsGroup:               ptr.To(int64(1000)),
		AllowPrivilegeEscalation: ptr.To(false),
		Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
	}

	replicas := int32(1)

	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:            cr.Name,
			Namespace:       cr.Namespace,
			Labels:          agentLabels(cr),
			OwnerReferences: []metav1.OwnerReference{*ownerRef},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"forge.ai/agent-id": cr.Name},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: agentLabels(cr),
				},
				Spec: corev1.PodSpec{
					// Set a friendly hostname so openclaw's mDNS uses the agent name
					// instead of the full pod name (UUID + hash, >63 bytes → DNS label crash).
					Hostname:                     dnsHostname(cr.Spec.AgentName),
					AutomountServiceAccountToken: ptr.To(false),
					SecurityContext: &corev1.PodSecurityContext{
						FSGroup: ptr.To(int64(1000)),
						SeccompProfile: &corev1.SeccompProfile{
							Type: corev1.SeccompProfileTypeRuntimeDefault,
						},
					},
					InitContainers: []corev1.Container{
						{
							Name:            "bootstrap-forge",
							Image:           fullImage,
							ImagePullPolicy: policy,
							Command:         []string{"sh", "/bootstrap/bootstrap.sh"},
							Env:             initEnv,
							VolumeMounts:    initMounts,
							SecurityContext: &corev1.SecurityContext{
								RunAsNonRoot:             ptr.To(true),
								RunAsUser:                ptr.To(int64(1000)),
								RunAsGroup:               ptr.To(int64(1000)),
								AllowPrivilegeEscalation: ptr.To(false),
								// initContainer writes to PVC — readOnlyRootFilesystem must be false
								ReadOnlyRootFilesystem: ptr.To(false),
								Capabilities:           &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
							},
						},
					},
					Containers: []corev1.Container{
						{
							Name:            "forge",
							Image:           fullImage,
							ImagePullPolicy: policy,
							Command:         []string{"node", "/app/dist/index.js", "gateway", "run"},
							Ports: []corev1.ContainerPort{
								{Name: "gateway", ContainerPort: gatewayPort},
							},
							Env:          mainEnv,
							VolumeMounts: stateMounts,
							Resources: corev1.ResourceRequirements{
								Requests: requests,
								Limits:   limits,
							},
							SecurityContext: &corev1.SecurityContext{
								RunAsNonRoot:             nonRoot.RunAsNonRoot,
								RunAsUser:                nonRoot.RunAsUser,
								RunAsGroup:               nonRoot.RunAsGroup,
								AllowPrivilegeEscalation: nonRoot.AllowPrivilegeEscalation,
								ReadOnlyRootFilesystem:   ptr.To(true),
								Capabilities:             nonRoot.Capabilities,
							},
						},
					},
					Volumes: volumes,
				},
			},
		},
	}
}

// dnsHostname converts an arbitrary agent name to a valid RFC 1123 DNS label
// (max 63 chars, lowercase, alphanumeric and hyphens only, no leading/trailing hyphens).
// This is used as spec.hostname in the pod to give openclaw's mDNS a short, friendly name
// instead of the full pod name (UUID + hash suffix, which exceeds the 63-byte limit).
var nonDNS = regexp.MustCompile(`[^a-z0-9-]+`)

func dnsHostname(name string) string {
	s := strings.ToLower(name)
	s = nonDNS.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 63 {
		s = s[:63]
		s = strings.TrimRight(s, "-")
	}
	if s == "" {
		return "agent"
	}
	return s
}
func resolveImage(cr *forgev1alpha1.Agent, defaultImage, defaultPullPolicy string) (string, corev1.PullPolicy) {
	img := defaultImage
	policy := corev1.PullPolicy(defaultPullPolicy)
	if policy == "" {
		policy = corev1.PullIfNotPresent
	}
	if cr.Spec.Image != nil {
		if cr.Spec.Image.Repository != "" && cr.Spec.Image.Tag != "" {
			img = cr.Spec.Image.Repository + ":" + cr.Spec.Image.Tag
		} else if cr.Spec.Image.Repository != "" {
			img = cr.Spec.Image.Repository
		}
		if cr.Spec.Image.PullPolicy != "" {
			policy = corev1.PullPolicy(cr.Spec.Image.PullPolicy)
		}
	}
	return img, policy
}

// envFromSecret builds an EnvVar that reads from a named Secret key.
// Keys that don't exist in the Secret result in an empty string (optional: true).
func envFromSecret(envName, secretName, secretKey string) corev1.EnvVar {
	return corev1.EnvVar{
		Name: envName,
		ValueFrom: &corev1.EnvVarSource{
			SecretKeyRef: &corev1.SecretKeySelector{
				LocalObjectReference: corev1.LocalObjectReference{Name: secretName},
				Key:                  secretKey,
				Optional:             ptr.To(true),
			},
		},
	}
}
