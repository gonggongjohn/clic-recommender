<template>
  <div>
    <p class="mb-6">{{ $t("feedback_intro") }}</p>

    <v-text-field
      v-model="sender"
      class="mb-4"
      variant="underlined"
      type="email"
      autocomplete="email"
      :label="$t('feedback_email')"
      :error-messages="senderError ? [senderError] : []"
      :disabled="sending"
      @update:model-value="senderError = ''"
    />

    <v-textarea
      v-model="body"
      variant="filled"
      rows="6"
      :label="$t('feedback_message')"
      :error-messages="bodyError ? [bodyError] : []"
      :disabled="sending"
      @update:model-value="bodyError = ''"
    />

    <v-alert
      v-if="status"
      class="mt-4"
      :type="status.type"
      variant="tonal"
      closable
      @click:close="status = null"
    >
      {{ status.text }}
    </v-alert>

    <div class="flex justify-end mt-6">
      <v-btn
        class="px-8"
        color="dark-purple"
        variant="flat"
        rounded="xl"
        size="large"
        prepend-icon="mdi-send"
        :loading="sending"
        @click="submit"
      >
        {{ $t("feedback_submit") }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

const sender = ref("");
const body = ref("");

const senderError = ref("");
const bodyError = ref("");

const sending = ref(false);
const status = ref<{ type: "success" | "error"; text: string } | null>(null);

// Deliberately permissive: the backend is the authority on what it accepts,
// this only catches obvious typos before a round trip.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = () => {
  senderError.value = "";
  bodyError.value = "";

  if (!sender.value.trim()) senderError.value = t("feedback_email_required");
  else if (!EMAIL.test(sender.value.trim()))
    senderError.value = t("feedback_email_invalid");

  if (!body.value.trim()) bodyError.value = t("feedback_message_required");

  return !senderError.value && !bodyError.value;
};

const submit = async () => {
  if (sending.value || !validate()) return;

  sending.value = true;
  status.value = null;

  try {
    await $fetch("/api/feedback", {
      method: "POST",
      body: { sender: sender.value.trim(), body: body.value.trim() },
    });

    status.value = { type: "success", text: t("feedback_success") };
    sender.value = "";
    body.value = "";
  } catch (error) {
    console.error("Feedback submission failed:", error);
    status.value = { type: "error", text: t("feedback_error") };
  } finally {
    sending.value = false;
  }
};
</script>
