package resources

import (
	forgev1alpha1 "github.com/ltreven/forge/controller/api/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const bootstrapScript = `#!/bin/sh
# NOTE: This script is the same bootstrap.sh from apps/agents/helm/files/bootstrap.sh
# mounted as a ConfigMap. The actual content is managed by the Helm chart / image.
# This placeholder is replaced at deploy time.
`

// BootstrapConfigMap builds the ConfigMap that holds bootstrap.sh.
// It is mounted into the initContainer at /bootstrap/bootstrap.sh.
// The script content is read from a well-known path inside the image;
// the ConfigMap stores a reference shell that delegates to the image copy.
//
// ownerRef ties this ConfigMap's lifecycle to the ForgeAgent CR —
// when the CR is deleted, K8s GC deletes this ConfigMap automatically.
func BootstrapConfigMap(cr *forgev1alpha1.Agent, ownerRef *metav1.OwnerReference) *corev1.ConfigMap {
	_ = bootstrapScript // avoid unused import warning

	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      cr.Name + "-bootstrap",
			Namespace: cr.Namespace,
			Labels:    agentLabels(cr),
			OwnerReferences: []metav1.OwnerReference{*ownerRef},
		},
		// The actual bootstrap.sh content lives inside the forge-agent image
		// at /opt/forge/bootstrap.sh. The ConfigMap mounts an exec wrapper
		// so the initContainer entrypoint is stable regardless of image version.
		Data: map[string]string{
			"bootstrap.sh": "#!/bin/sh\nexec /opt/forge/bootstrap.sh \"$@\"\n",
		},
	}
}
