import {
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  VStack,
  useToast,
  SimpleGrid,
  HStack,
  FormHelperText,
} from "@hope-ui/solid"
import { createSignal } from "solid-js"
import { useFetch, useT, useManageTitle } from "~/hooks"
import { me } from "~/store"
import { PEmptyResp } from "~/types"
import { handleResp, notify, r } from "~/utils"

const Profile = () => {
  useManageTitle("tenant.sidemenu.profile")
  const t = useT()
  
  const [oldPassword, setOldPassword] = createSignal("")
  const [newPassword, setNewPassword] = createSignal("")
  const [confirmPassword, setConfirmPassword] = createSignal("")
  
  const [loading, save] = useFetch(
    (): PEmptyResp =>
      r.post("/me/update", {
        username: me().username,
        old_password: oldPassword(),
        password: newPassword(),
      }),
  )
  
  const saveProfile = async () => {
    if (!oldPassword()) {
      notify.warning(t("users.old_password_required"))
      return
    }
    
    if (!newPassword()) {
      notify.warning(t("users.new_password_required"))
      return
    }
    
    if (newPassword() !== confirmPassword()) {
      notify.warning(t("users.confirm_password_not_same"))
      return
    }
    
    const resp = await save()
    handleResp(resp, () => {
      notify.success(t("users.update_profile_success"))
      // 清空表单
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    })
  }
  
  return (
    <VStack w="$full" spacing="$4" alignItems="start">
      <Heading>{t("tenant.profile.change_password")}</Heading>
      
      <SimpleGrid gap="$2" columns={{ "@initial": 1, "@md": 1 }}>
        <FormControl required>
          <FormLabel for="old_password">
            {t("users.old_password")}
          </FormLabel>
          <Input
            id="old_password"
            type="password"
            placeholder="********"
            value={oldPassword()}
            onInput={(e) => setOldPassword(e.currentTarget.value)}
          />
        </FormControl>
      </SimpleGrid>
      
      <SimpleGrid gap="$2" columns={{ "@initial": 1, "@md": 2 }}>
        <FormControl required>
          <FormLabel for="new_password">
            {t("users.new_password")}
          </FormLabel>
          <Input
            id="new_password"
            type="password"
            placeholder="********"
            value={newPassword()}
            onInput={(e) => setNewPassword(e.currentTarget.value)}
          />
          <FormHelperText fontSize="$sm">{t("users.change_password-tips")}</FormHelperText>
        </FormControl>
        
        <FormControl required>
          <FormLabel for="confirm_password">
            {t("users.confirm_password")}
          </FormLabel>
          <Input
            id="confirm_password"
            type="password"
            placeholder="********"
            value={confirmPassword()}
            onInput={(e) => setConfirmPassword(e.currentTarget.value)}
          />
          <FormHelperText fontSize="$sm">{t("users.confirm_password-tips")}</FormHelperText>
        </FormControl>
      </SimpleGrid>
      
      <HStack spacing="$2">
        <Button 
          loading={loading()} 
          onClick={saveProfile}
          colorScheme="info"
        >
          {t("global.save")}
        </Button>
      </HStack>
    </VStack>
  )
}

export default Profile