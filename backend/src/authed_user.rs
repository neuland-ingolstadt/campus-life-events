use crate::models::AccountType;

#[derive(Clone, Debug)]
pub(crate) struct AuthedUser {
    pub(crate) account_id: i64,
    pub(crate) account_type: AccountType,
    pub(crate) organizer_id: Option<i64>,
}

impl AuthedUser {
    pub(crate) fn is_admin(&self) -> bool {
        matches!(self.account_type, AccountType::Admin)
    }

    pub(crate) fn organizer_id(&self) -> Option<i64> {
        self.organizer_id
    }
}
